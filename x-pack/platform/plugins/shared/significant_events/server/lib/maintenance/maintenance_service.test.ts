/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import { SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { GetScopedClients } from '../../routes/types';
import { createSignificantEventsMaintenanceService } from './maintenance_service';
import {
  SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_ID,
  SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
} from './saved_object';

const REQUEST = {} as KibanaRequest;

// A minimal, stateful saved-objects client: `get` throws NotFound until `create`
// stores the doc, then returns it. Enough to exercise the read/write/idempotency paths.
function makeSoClient() {
  const store = new Map<string, Record<string, unknown>>();
  const key = (type: string, id: string) => `${type}:${id}`;
  return {
    get: jest.fn(async (type: string, id: string) => {
      const attributes = store.get(key(type, id));
      if (!attributes) {
        throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
      }
      return { id, type, references: [], attributes };
    }),
    create: jest.fn(
      async (type: string, attributes: Record<string, unknown>, options: { id: string }) => {
        store.set(key(type, options.id), attributes);
        return { id: options.id, type, references: [], attributes };
      }
    ),
  };
}

// Stateful workflows management mock: tracks each workflow's `enabled` flag so a
// pause→resume round-trip reads back what the previous step wrote.
function makeManagementApi(options?: {
  executionsByWorkflow?: Record<string, Array<{ id: string }>>;
  failUpdateFor?: string;
  failEnableFor?: string;
  failCancelFor?: string;
}) {
  const enabled = new Map<string, boolean>();
  const stateKey = (id: string, spaceId: string) => `${id}@${spaceId}`;

  const getWorkflow = jest.fn(async (id: string, spaceId: string) => ({
    id,
    enabled: enabled.get(stateKey(id, spaceId)) ?? true,
    definition: { id },
  }));

  const updateWorkflow = jest.fn(
    async (id: string, patch: { enabled?: boolean }, spaceId: string) => {
      if (options?.failUpdateFor === id) {
        throw new Error(`update failed for ${id}`);
      }
      if (options?.failEnableFor === id && patch.enabled === true) {
        throw new Error(`enable failed for ${id}`);
      }
      enabled.set(stateKey(id, spaceId), patch.enabled ?? true);
      return {
        id,
        enabled: patch.enabled,
        validationErrors: [] as string[],
        lastUpdatedAt: new Date().toISOString(),
        lastUpdatedBy: 'system',
        valid: true,
      };
    }
  );

  const getWorkflowExecutions = jest.fn(async (params: { workflowId: string }) => {
    const results = options?.executionsByWorkflow?.[params.workflowId] ?? [];
    return { results, total: results.length };
  });

  const cancelWorkflowExecution = jest.fn(async (executionId: string) => {
    if (options?.failCancelFor === executionId) {
      throw new Error(`cancel failed for ${executionId}`);
    }
    return undefined;
  });

  return {
    api: { getWorkflow, updateWorkflow, getWorkflowExecutions, cancelWorkflowExecution },
    getWorkflow,
    updateWorkflow,
    getWorkflowExecutions,
    cancelWorkflowExecution,
  };
}

interface BulkError {
  id: string;
  error: { statusCode: number; message: string };
}

// Alerting v2 rules client stub. Records the ids each call received and returns
// the configured per-id errors (empty = all succeeded).
function makeV2RulesClient(options?: { disableErrors?: BulkError[]; enableErrors?: BulkError[] }) {
  const bulkDisableRules = jest.fn(async (_params: { ids: string[] }) => ({
    errors: options?.disableErrors ?? [],
  }));
  const bulkEnableRules = jest.fn(async (_params: { ids: string[] }) => ({
    errors: options?.enableErrors ?? [],
  }));
  return { bulkDisableRules, bulkEnableRules };
}

function makeService(params?: {
  management?: ReturnType<typeof makeManagementApi>['api'];
  ruleBackedRuleIds?: string[];
  v2RulesClient?: ReturnType<typeof makeV2RulesClient> | null;
  spacesGetAllThrows?: boolean;
}) {
  const soClient = makeSoClient();
  // `null` models the alerting v2 plugin being unavailable.
  const v2RulesClient =
    params?.v2RulesClient === null ? undefined : params?.v2RulesClient ?? makeV2RulesClient();
  const getRuleBackedQueryLinks = jest.fn(async () =>
    (params?.ruleBackedRuleIds ?? []).map((rule_id) => ({ rule_id }))
  );

  const server = {
    core: {
      savedObjects: { getScopedClient: jest.fn(() => soClient) },
    },
    workflowsManagement: params?.management ? { management: params.management } : undefined,
    spaces: {
      spacesService: {
        createSpacesClient: jest.fn(() => ({
          getAll: jest.fn(async () => {
            if (params?.spacesGetAllThrows) {
              throw new Error('spaces unavailable');
            }
            return [{ id: 'default' }];
          }),
        })),
      },
    },
  } as unknown as StreamsServer;

  const getScopedClients = jest.fn(async () => ({
    getKnowledgeIndicatorClient: async () => ({ getRuleBackedQueryLinks }),
    getSignificantEventsAlertingContext: async () => ({ alertingV2RulesClient: v2RulesClient }),
  })) as unknown as GetScopedClients;

  const service = createSignificantEventsMaintenanceService({
    logger: loggerMock.create(),
    server,
    getScopedClients,
  });

  return { service, soClient, v2RulesClient, getRuleBackedQueryLinks };
}

describe('SignificantEventsMaintenanceService', () => {
  describe('getStatus', () => {
    it('reports the running state when no state has been persisted', async () => {
      const { service } = makeService();
      await expect(service.getStatus({ request: REQUEST })).resolves.toEqual({ state: 'running' });
    });
  });

  describe('pause', () => {
    it('disables workflows and v2-backed rules, cancels executions, and persists the paused state', async () => {
      const { api, updateWorkflow, cancelWorkflowExecution } = makeManagementApi({
        executionsByWorkflow: {
          [SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID]: [{ id: 'exec-1' }],
        },
      });
      const { service, soClient, v2RulesClient } = makeService({
        management: api,
        ruleBackedRuleIds: ['rule-1', 'rule-2', 'rule-1'],
      });

      const summary = await service.pause({ request: REQUEST, updatedBy: 'marco' });

      expect(summary.state).toBe('paused');
      expect(summary.workflowsDisabled).toBeGreaterThan(0);
      expect(summary.rulesDisabled).toBe(2);
      expect(summary.executionsCancelled).toBe(1);
      expect(summary.partialFailures).toEqual([]);

      // every disable is an enablement-only update
      expect(updateWorkflow).toHaveBeenCalledWith(
        expect.any(String),
        { enabled: false },
        expect.any(String),
        REQUEST
      );
      // deduped rule ids, disabled in bulk on the v2 engine
      expect(v2RulesClient?.bulkDisableRules).toHaveBeenCalledWith({ ids: ['rule-1', 'rule-2'] });
      expect(cancelWorkflowExecution).toHaveBeenCalledWith('exec-1', expect.any(String), REQUEST);

      // persisted with attribution
      expect(soClient.create).toHaveBeenLastCalledWith(
        SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
        expect.objectContaining({ state: 'paused', updatedBy: 'marco' }),
        { id: SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_ID, overwrite: true }
      );

      await expect(service.getStatus({ request: REQUEST })).resolves.toEqual(
        expect.objectContaining({ state: 'paused', updatedBy: 'marco' })
      );
    });

    it('re-pauses while already paused: retries a workflow that failed the first time', async () => {
      const enabled = new Map<string, boolean>();
      const stateKey = (id: string, spaceId: string) => `${id}@${spaceId}`;
      let failOnboarding = true;

      const getWorkflow = jest.fn(async (id: string, spaceId: string) => ({
        id,
        enabled: enabled.get(stateKey(id, spaceId)) ?? true,
        definition: { id },
      }));
      const updateWorkflow = jest.fn(
        async (id: string, patch: { enabled?: boolean }, spaceId: string) => {
          if (failOnboarding && id === SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID) {
            throw new Error('update failed for onboarding');
          }
          enabled.set(stateKey(id, spaceId), patch.enabled ?? true);
          return {
            id,
            enabled: patch.enabled,
            validationErrors: [] as string[],
            lastUpdatedAt: new Date().toISOString(),
            lastUpdatedBy: 'system',
            valid: true,
          };
        }
      );
      const api = {
        getWorkflow,
        updateWorkflow,
        getWorkflowExecutions: jest.fn(async (_params: { workflowId: string }) => ({
          results: [] as Array<{ id: string }>,
          total: 0,
        })),
        cancelWorkflowExecution: jest.fn(),
      };
      const { service } = makeService({ management: api });

      const first = await service.pause({ request: REQUEST });
      expect(first.partialFailures.some((f) => f.target.includes('onboarding'))).toBe(true);

      failOnboarding = false;
      const second = await service.pause({ request: REQUEST });

      expect(second.partialFailures).toEqual([]);
      expect(second.workflowsDisabled).toBeGreaterThan(0);
      const status = await service.getStatus({ request: REQUEST });
      expect(status.state).toBe('paused');
      expect(
        status.lastSummary?.partialFailures.some((f) => f.target.includes('onboarding'))
      ).toBeFalsy();
    });

    it('is a no-op for already-disabled workflows on a clean re-pause', async () => {
      const { api, updateWorkflow } = makeManagementApi();
      const { service } = makeService({ management: api, ruleBackedRuleIds: ['rule-1'] });

      await service.pause({ request: REQUEST });
      const callsAfterFirst = updateWorkflow.mock.calls.length;

      const second = await service.pause({ request: REQUEST });

      expect(second.state).toBe('paused');
      expect(second.workflowsDisabled).toBe(0);
      expect(updateWorkflow.mock.calls.length).toBe(callsAfterFirst);
    });

    it('records a partial failure but still pauses when one workflow cannot be disabled', async () => {
      const { api } = makeManagementApi({
        failUpdateFor: SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
      });
      const { service } = makeService({ management: api });

      const summary = await service.pause({ request: REQUEST });

      expect(summary.state).toBe('paused');
      expect(summary.partialFailures.length).toBeGreaterThan(0);
      expect(summary.partialFailures[0].target).toContain(
        SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID
      );
    });

    it('still pauses (recording a failure) when workflows management is unavailable', async () => {
      const { service } = makeService({ management: undefined });

      const summary = await service.pause({ request: REQUEST });

      expect(summary.state).toBe('paused');
      expect(summary.workflowsDisabled).toBe(0);
      expect(summary.partialFailures).toEqual([
        { target: 'workflows', error: 'Workflows management plugin is not available' },
      ]);
    });

    it('records per-rule failures and only counts the rules that were actually disabled', async () => {
      const { api } = makeManagementApi();
      const v2RulesClient = makeV2RulesClient({
        disableErrors: [{ id: 'rule-2', error: { statusCode: 500, message: 'boom' } }],
      });
      const { service } = makeService({
        management: api,
        ruleBackedRuleIds: ['rule-1', 'rule-2'],
        v2RulesClient,
      });

      const summary = await service.pause({ request: REQUEST });

      expect(summary.rulesDisabled).toBe(1);
      expect(summary.partialFailures).toContainEqual({ target: 'rule:rule-2', error: 'boom' });
    });

    it('treats a 404 from a backed rule as already-gone (no failure, not counted)', async () => {
      const { api } = makeManagementApi();
      const v2RulesClient = makeV2RulesClient({
        disableErrors: [{ id: 'rule-2', error: { statusCode: 404, message: 'not found' } }],
      });
      const { service } = makeService({
        management: api,
        ruleBackedRuleIds: ['rule-1', 'rule-2'],
        v2RulesClient,
      });

      const summary = await service.pause({ request: REQUEST });

      expect(summary.rulesDisabled).toBe(1);
      expect(summary.partialFailures).toEqual([]);
    });

    it('records a failure when the alerting v2 rules client is unavailable', async () => {
      const { api } = makeManagementApi();
      const { service } = makeService({
        management: api,
        ruleBackedRuleIds: ['rule-1'],
        v2RulesClient: null,
      });

      const summary = await service.pause({ request: REQUEST });

      expect(summary.rulesDisabled).toBe(0);
      expect(summary.partialFailures).toContainEqual({
        target: 'rules',
        error: 'Alerting v2 rules client is not available',
      });
    });

    it('counts only the executions that were actually cancelled', async () => {
      const { api } = makeManagementApi({
        executionsByWorkflow: {
          [SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID]: [{ id: 'exec-1' }, { id: 'exec-2' }],
        },
        failCancelFor: 'exec-2',
      });
      const { service } = makeService({ management: api });

      const summary = await service.pause({ request: REQUEST });

      expect(summary.executionsCancelled).toBe(1);
      expect(summary.partialFailures).toContainEqual({
        target: expect.stringContaining('execution:exec-2'),
        error: expect.stringContaining('cancel failed'),
      });
    });

    it('surfaces a failure (and processes the default space) when spaces cannot be enumerated', async () => {
      const { api } = makeManagementApi();
      const { service } = makeService({ management: api, spacesGetAllThrows: true });

      const summary = await service.pause({ request: REQUEST });

      expect(summary.state).toBe('paused');
      expect(summary.partialFailures).toContainEqual({
        target: 'spaces',
        error: expect.stringContaining('Failed to enumerate spaces'),
      });
    });
  });

  describe('resume', () => {
    it('re-enables exactly the workflows and rules that pause disabled', async () => {
      const { api, updateWorkflow } = makeManagementApi();
      const { service, v2RulesClient } = makeService({
        management: api,
        ruleBackedRuleIds: ['rule-1', 'rule-2'],
      });

      await service.pause({ request: REQUEST });
      updateWorkflow.mockClear();

      const summary = await service.resume({ request: REQUEST });

      expect(summary.state).toBe('running');
      expect(updateWorkflow).toHaveBeenCalledWith(
        expect.any(String),
        { enabled: true },
        expect.any(String),
        REQUEST
      );
      expect(v2RulesClient?.bulkEnableRules).toHaveBeenCalledWith({ ids: ['rule-1', 'rule-2'] });

      await expect(service.getStatus({ request: REQUEST })).resolves.toEqual(
        expect.objectContaining({ state: 'running' })
      );
    });

    it('is a no-op when not paused', async () => {
      const { api, updateWorkflow } = makeManagementApi();
      const { service, v2RulesClient } = makeService({ management: api });

      const summary = await service.resume({ request: REQUEST });

      expect(summary).toEqual({
        state: 'running',
        executionsCancelled: 0,
        workflowsDisabled: 0,
        rulesDisabled: 0,
        partialFailures: [],
      });
      expect(updateWorkflow).not.toHaveBeenCalled();
      expect(v2RulesClient?.bulkEnableRules).not.toHaveBeenCalled();
    });

    it('stays paused and keeps the workflow recorded when it cannot be re-enabled', async () => {
      const { api } = makeManagementApi({
        failEnableFor: SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
      });
      const { service, soClient } = makeService({ management: api });

      await service.pause({ request: REQUEST });
      const summary = await service.resume({ request: REQUEST });

      expect(summary.state).toBe('paused');
      expect(summary.partialFailures.length).toBeGreaterThan(0);
      // The still-disabled workflow is preserved so a later resume can retry it.
      const lastWrite = soClient.create.mock.calls.at(-1);
      expect(lastWrite?.[1]).toEqual(
        expect.objectContaining({
          state: 'paused',
          disabledWorkflows: expect.arrayContaining([
            expect.objectContaining({ id: SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID }),
          ]),
        })
      );
      await expect(service.getStatus({ request: REQUEST })).resolves.toEqual(
        expect.objectContaining({ state: 'paused' })
      );
    });

    it('stays paused and keeps the rule recorded when it cannot be re-enabled', async () => {
      const { api } = makeManagementApi();
      const v2RulesClient = makeV2RulesClient({
        enableErrors: [{ id: 'rule-1', error: { statusCode: 500, message: 'boom' } }],
      });
      const { service, soClient } = makeService({
        management: api,
        ruleBackedRuleIds: ['rule-1'],
        v2RulesClient,
      });

      await service.pause({ request: REQUEST });
      const summary = await service.resume({ request: REQUEST });

      expect(summary.state).toBe('paused');
      expect(summary.partialFailures).toContainEqual({ target: 'rule:rule-1', error: 'boom' });
      const lastWrite = soClient.create.mock.calls.at(-1);
      expect(lastWrite?.[1]).toEqual(
        expect.objectContaining({ state: 'paused', disabledRuleIds: ['rule-1'] })
      );
    });

    it('preserves pause disable counts in lastSummary when resume is incomplete', async () => {
      const { api } = makeManagementApi({
        failEnableFor: SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
      });
      const { service } = makeService({
        management: api,
        ruleBackedRuleIds: ['rule-1'],
      });

      const pauseSummary = await service.pause({ request: REQUEST });
      expect(pauseSummary.workflowsDisabled).toBeGreaterThan(0);
      expect(pauseSummary.rulesDisabled).toBe(1);

      const resumeSummary = await service.resume({ request: REQUEST });

      expect(resumeSummary.state).toBe('paused');
      expect(resumeSummary.workflowsDisabled).toBe(pauseSummary.workflowsDisabled);
      expect(resumeSummary.rulesDisabled).toBe(pauseSummary.rulesDisabled);
      expect(resumeSummary.partialFailures.length).toBeGreaterThan(0);
    });
  });
});
