/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
} from '@kbn/management-settings-ids';
import { loggerMock } from '@kbn/logging-mocks';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import {
  SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { GetScopedClients } from '../../routes/types';
import { createSignificantEventsMaintenanceService } from './maintenance_service';
import {
  SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_ID,
  SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
} from './saved_object';

const REQUEST = { headers: {} } as KibanaRequest;

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

function makeUiSettingsClient(
  initial: Record<string, boolean | number | string> = {},
  options?: { failSetFor?: string }
) {
  const store = new Map<string, boolean | number | string>(Object.entries(initial));
  return {
    get: jest.fn(async <T>(key: string, defaultValue?: T) =>
      store.has(key) ? (store.get(key) as T) : defaultValue
    ),
    set: jest.fn(async (key: string, value: boolean | number | string) => {
      if (options?.failSetFor === key) {
        throw new Error(`set failed for ${key}`);
      }
      store.set(key, value);
    }),
    getAll: jest.fn(async () => Object.fromEntries(store)),
    _store: store,
  };
}

function makeService(params?: {
  management?: ReturnType<typeof makeManagementApi>['api'];
  ruleBackedRuleIds?: string[];
  v2RulesClient?: ReturnType<typeof makeV2RulesClient> | null;
  spacesGetAllThrows?: boolean;
  internalSpacesFindThrows?: boolean;
  internalSpaceIds?: string[];
  /** Global continuous-onboarding toggle before pause (default: off). */
  continuousOnboardingEnabled?: boolean;
  /** Per-space scheduled-discovery toggle before pause (default: off). */
  scheduledDiscoveryEnabled?: boolean;
  /** Make the continuous-onboarding uiSettings `set` throw. */
  failContinuousSet?: boolean;
  /** Make the scheduled-discovery uiSettings `set` throw. */
  failScheduledSet?: boolean;
}) {
  const soClient = makeSoClient();
  // `null` models the alerting v2 plugin being unavailable.
  const v2RulesClient =
    params?.v2RulesClient === null ? undefined : params?.v2RulesClient ?? makeV2RulesClient();
  const getRuleBackedQueryLinks = jest.fn(async () =>
    (params?.ruleBackedRuleIds ?? []).map((rule_id) => ({ rule_id }))
  );

  const createInternalRepository = jest.fn(() => ({
    find: jest.fn(async () => {
      if (params?.internalSpacesFindThrows) {
        throw new Error('internal spaces unavailable');
      }
      const ids = params?.internalSpaceIds ?? ['default'];
      return {
        saved_objects: ids.map((id) => ({ id, type: 'space', attributes: { name: id } })),
      };
    }),
  }));

  const globalUiSettingsClient = makeUiSettingsClient(
    {
      [OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED]:
        params?.continuousOnboardingEnabled ?? false,
    },
    params?.failContinuousSet
      ? { failSetFor: OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED }
      : undefined
  );
  const spaceUiSettingsClient = makeUiSettingsClient(
    {
      [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED]:
        params?.scheduledDiscoveryEnabled ?? false,
    },
    params?.failScheduledSet
      ? { failSetFor: OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED }
      : undefined
  );

  const server = {
    core: {
      savedObjects: {
        getScopedClient: jest.fn(() => soClient),
        createInternalRepository,
      },
      uiSettings: {
        asScopedToClient: jest.fn(() => spaceUiSettingsClient),
      },
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
    globalUiSettingsClient,
    uiSettingsClient: spaceUiSettingsClient,
  })) as unknown as GetScopedClients;

  const service = createSignificantEventsMaintenanceService({
    logger: loggerMock.create(),
    server,
    getScopedClients,
  });

  return {
    service,
    soClient,
    v2RulesClient,
    getRuleBackedQueryLinks,
    globalUiSettingsClient,
    spaceUiSettingsClient,
  };
}

describe('SignificantEventsMaintenanceService', () => {
  describe('getState', () => {
    it('returns enabled when no state has been persisted', async () => {
      const { service } = makeService();
      await expect(service.getState({ request: REQUEST })).resolves.toBe('enabled');
    });

    it('returns the persisted state without reading feature settings', async () => {
      const { api } = makeManagementApi();
      const { service, globalUiSettingsClient } = makeService({ management: api });

      await service.pause({ request: REQUEST });
      globalUiSettingsClient.get.mockClear();

      await expect(service.getState({ request: REQUEST })).resolves.toBe('paused');
      expect(globalUiSettingsClient.get).not.toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    it('reports the enabled state when no state has been persisted', async () => {
      const { service } = makeService();
      await expect(service.getStatus({ request: REQUEST })).resolves.toEqual({
        state: 'enabled',
        featureSettings: {
          continuousOnboardingEnabled: false,
          scheduledDiscoveryEnabled: false,
        },
      });
    });
  });

  describe('pause', () => {
    it('disables workflows and v2-backed rules, cancels executions, and persists the paused state', async () => {
      const { api, updateWorkflow, cancelWorkflowExecution } = makeManagementApi({
        executionsByWorkflow: {
          [SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID]: [{ id: 'exec-1' }],
        },
      });
      const { service, soClient, v2RulesClient, globalUiSettingsClient, spaceUiSettingsClient } =
        makeService({
          management: api,
          ruleBackedRuleIds: ['rule-1', 'rule-2', 'rule-1'],
          continuousOnboardingEnabled: true,
          scheduledDiscoveryEnabled: true,
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

      // Settings toggles turned off; prior-enabled flags stored for resume.
      expect(globalUiSettingsClient.set).toHaveBeenCalledWith(
        OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED,
        false
      );
      expect(spaceUiSettingsClient.set).toHaveBeenCalledWith(
        OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
        false
      );

      // persisted with attribution
      expect(soClient.create).toHaveBeenLastCalledWith(
        SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
        expect.objectContaining({
          state: 'paused',
          updatedBy: 'marco',
          pausedSettings: {
            continuousOnboardingWasEnabled: true,
            scheduledDiscoveryEnabledSpaceIds: ['default'],
          },
        }),
        { id: SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_ID, overwrite: true }
      );

      await expect(service.getStatus({ request: REQUEST })).resolves.toEqual(
        expect.objectContaining({
          state: 'paused',
          updatedBy: 'marco',
          featureSettings: {
            continuousOnboardingEnabled: false,
            scheduledDiscoveryEnabled: false,
          },
        })
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

    it('is a no-op for already-disabled workflows on a clean re-pause but keeps snapshot counts', async () => {
      const { api, updateWorkflow } = makeManagementApi();
      const { service } = makeService({ management: api, ruleBackedRuleIds: ['rule-1'] });

      const first = await service.pause({ request: REQUEST });
      const callsAfterFirst = updateWorkflow.mock.calls.length;

      const second = await service.pause({ request: REQUEST });

      expect(second.state).toBe('paused');
      // Sweep deltas are zero, but lastSummary keeps snapshot sizes for the UI.
      expect(second.workflowsDisabled).toBe(first.workflowsDisabled);
      expect(second.rulesDisabled).toBe(first.rulesDisabled);
      expect(second.workflowsDisabled).toBeGreaterThan(0);
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
      const { service } = makeService({
        management: api,
        internalSpacesFindThrows: true,
        spacesGetAllThrows: true,
      });

      const summary = await service.pause({ request: REQUEST });

      expect(summary.state).toBe('paused');
      expect(summary.partialFailures).toContainEqual({
        target: 'spaces',
        error: expect.stringContaining('Failed to enumerate spaces'),
      });
    });

    it('enumerates spaces via the internal repository when available', async () => {
      const { api, updateWorkflow } = makeManagementApi();
      const { service } = makeService({
        management: api,
        internalSpaceIds: ['default', 'space-a'],
      });

      await service.pause({ request: REQUEST });

      // Scheduled workflow documents are space-suffixed; both spaces should be hit.
      const disabledDocumentIds = updateWorkflow.mock.calls.map((call) => call[0] as string);
      expect(disabledDocumentIds.some((id) => id.includes('space-a'))).toBe(true);
    });

    it('records a backlog failure when cancel pass-2 cannot drain remaining executions', async () => {
      const { api } = makeManagementApi({
        executionsByWorkflow: {
          [SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID]: [{ id: 'stuck-exec' }],
        },
        failCancelFor: 'stuck-exec',
      });
      const { service } = makeService({ management: api });

      const summary = await service.pause({ request: REQUEST });

      expect(summary.partialFailures).toContainEqual({
        target: expect.stringContaining('execution-backlog:'),
        error: expect.stringContaining('Cancel backlog not drained'),
      });
    });

    it('records a backlog failure when cancel pass-2 hits the round cap with remaining executions', async () => {
      let call = 0;
      const { api } = makeManagementApi();
      api.getWorkflowExecutions.mockImplementation(async (params: { workflowId: string }) => {
        if (params.workflowId !== SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID) {
          return { results: [], total: 0 };
        }
        call += 1;
        // Every re-check returns a brand-new id so cancel always accepts until the cap.
        return { results: [{ id: `exec-${call}` }], total: 1 };
      });
      const { service } = makeService({ management: api });

      const summary = await service.pause({ request: REQUEST });

      expect(summary.partialFailures).toContainEqual({
        target: expect.stringContaining('execution-backlog:'),
        error: expect.stringContaining('after 50 rounds'),
      });
    });

    it('records restore flags when settings were enabled even if set(false) fails', async () => {
      const { api } = makeManagementApi();
      const { service, soClient } = makeService({
        management: api,
        continuousOnboardingEnabled: true,
        scheduledDiscoveryEnabled: true,
        failContinuousSet: true,
        failScheduledSet: true,
      });

      const summary = await service.pause({ request: REQUEST });

      expect(summary.state).toBe('paused');
      expect(summary.partialFailures).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            target: 'settings:continuous-onboarding',
            error: expect.stringContaining('Failed to pause'),
          }),
          expect.objectContaining({
            target: expect.stringContaining('settings:scheduled-discovery@'),
            error: expect.stringContaining('Failed to pause'),
          }),
        ])
      );

      const pauseWrite = soClient.create.mock.calls.at(-1)?.[1] as {
        pausedSettings?: {
          continuousOnboardingWasEnabled: boolean;
          scheduledDiscoveryEnabledSpaceIds: string[];
        };
      };
      expect(pauseWrite.pausedSettings).toEqual({
        continuousOnboardingWasEnabled: true,
        scheduledDiscoveryEnabledSpaceIds: ['default'],
      });
    });
  });

  describe('reassertPausedWorkflows', () => {
    it('is a no-op when not paused', async () => {
      const { api, updateWorkflow } = makeManagementApi();
      const { service } = makeService({ management: api });

      await service.reassertPausedWorkflows({ request: REQUEST });

      expect(updateWorkflow).not.toHaveBeenCalled();
    });

    it('re-disables workflows after a flag-flip style re-enable while paused', async () => {
      const { api, updateWorkflow, getWorkflow } = makeManagementApi();
      const { service } = makeService({ management: api });

      await service.pause({ request: REQUEST });
      updateWorkflow.mockClear();

      // Simulate install re-enabling a workflow while pause is still in effect.
      getWorkflow.mockImplementation(async (id: string, spaceId: string) => ({
        id,
        enabled: true,
        definition: { id },
      }));

      await service.reassertPausedWorkflows({ request: REQUEST });

      expect(updateWorkflow).toHaveBeenCalledWith(
        expect.any(String),
        { enabled: false },
        expect.any(String),
        REQUEST
      );
      const status = await service.getStatus({ request: REQUEST });
      expect(status.state).toBe('paused');
      expect(status.updatedAt).toBeDefined();
    });

    it('persists sweep failures on lastSummary so status shows a degraded pause', async () => {
      const { api } = makeManagementApi();
      const { service, soClient } = makeService({ management: api });

      await service.pause({ request: REQUEST });

      // Simulate install leaving workflows enabled while management is unhealthy.
      api.getWorkflow.mockRejectedValue(new Error('workflows down'));

      await service.reassertPausedWorkflows({ request: REQUEST });

      const lastWrite = soClient.create.mock.calls.at(-1)?.[1] as {
        lastSummary?: { partialFailures: Array<{ target: string; error: string }> };
        updatedAt?: string;
      };
      expect(lastWrite?.lastSummary?.partialFailures.length).toBeGreaterThan(0);
      expect(lastWrite?.lastSummary?.partialFailures[0].error).toContain('workflows down');
      expect(lastWrite?.updatedAt).toBeDefined();
    });

    it('propagates a persist failure during reassert instead of masking it with a second write', async () => {
      const { api } = makeManagementApi();
      const { service, soClient } = makeService({ management: api });

      await service.pause({ request: REQUEST });
      const writesAfterPause = soClient.create.mock.calls.length;

      // The single reassert write fails. A persistence failure is inherently
      // unpersistable, so it surfaces to the caller (the plugin hook logs it)
      // rather than triggering a second "we failed to persist" write.
      soClient.create.mockRejectedValueOnce(new Error('so write failed'));

      await expect(service.reassertPausedWorkflows({ request: REQUEST })).rejects.toThrow(
        'so write failed'
      );
      expect(soClient.create.mock.calls.length).toBe(writesAfterPause + 1);
    });
  });

  describe('persist write failures', () => {
    it('propagates a pause persist failure after the sweep has already applied side effects', async () => {
      const { api, updateWorkflow } = makeManagementApi();
      const { service, soClient } = makeService({ management: api });

      soClient.create.mockRejectedValueOnce(new Error('so write failed on pause'));

      await expect(service.pause({ request: REQUEST })).rejects.toThrow('so write failed on pause');
      // Sweep still disabled workflows before the failed write.
      expect(updateWorkflow).toHaveBeenCalled();
    });
  });

  describe('resume', () => {
    it('re-enables exactly the workflows and rules that pause disabled', async () => {
      const { api, updateWorkflow } = makeManagementApi();
      const { service, v2RulesClient, globalUiSettingsClient, spaceUiSettingsClient } = makeService(
        {
          management: api,
          ruleBackedRuleIds: ['rule-1', 'rule-2'],
          continuousOnboardingEnabled: true,
          scheduledDiscoveryEnabled: true,
        }
      );

      await service.pause({ request: REQUEST });
      updateWorkflow.mockClear();
      globalUiSettingsClient.set.mockClear();
      spaceUiSettingsClient.set.mockClear();

      const summary = await service.resume({ request: REQUEST });

      expect(summary.state).toBe('enabled');
      expect(updateWorkflow).toHaveBeenCalledWith(
        expect.any(String),
        { enabled: true },
        expect.any(String),
        REQUEST
      );
      expect(v2RulesClient?.bulkEnableRules).toHaveBeenCalledWith({ ids: ['rule-1', 'rule-2'] });
      expect(globalUiSettingsClient.set).toHaveBeenCalledWith(
        OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED,
        true
      );
      expect(spaceUiSettingsClient.set).toHaveBeenCalledWith(
        OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
        true
      );

      await expect(service.getStatus({ request: REQUEST })).resolves.toEqual(
        expect.objectContaining({
          state: 'enabled',
          featureSettings: {
            continuousOnboardingEnabled: true,
            scheduledDiscoveryEnabled: true,
          },
        })
      );
    });

    it('does not re-enable settings-backed workflows that were off before pause', async () => {
      const { api, updateWorkflow } = makeManagementApi();
      const { service, globalUiSettingsClient, spaceUiSettingsClient, soClient } = makeService({
        management: api,
        // Continuous + scheduled settings were already off — only workflows may be
        // enabled (drift). Resume must leave both settings and those workflows off.
        continuousOnboardingEnabled: false,
        scheduledDiscoveryEnabled: false,
      });

      await service.pause({ request: REQUEST });
      const pauseWrite = soClient.create.mock.calls.at(-1)?.[1] as {
        pausedSettings?: {
          continuousOnboardingWasEnabled: boolean;
          scheduledDiscoveryEnabledSpaceIds: string[];
        };
        disabledWorkflows: Array<{ id: string; spaceId: string }>;
      };
      expect(pauseWrite.pausedSettings).toEqual({
        continuousOnboardingWasEnabled: false,
        scheduledDiscoveryEnabledSpaceIds: [],
      });
      expect(
        pauseWrite.disabledWorkflows.some(
          (workflow) => workflow.id === SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID
        )
      ).toBe(true);

      updateWorkflow.mockClear();
      globalUiSettingsClient.set.mockClear();
      spaceUiSettingsClient.set.mockClear();

      const summary = await service.resume({ request: REQUEST });

      expect(summary.state).toBe('enabled');
      expect(globalUiSettingsClient.set).not.toHaveBeenCalledWith(
        OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED,
        true
      );
      expect(spaceUiSettingsClient.set).not.toHaveBeenCalledWith(
        OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
        true
      );
      const reEnabledIds = updateWorkflow.mock.calls
        .filter((call) => call[1]?.enabled === true)
        .map((call) => call[0] as string);
      expect(reEnabledIds).not.toContain(SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID);
      expect(
        reEnabledIds.some((id) => id.startsWith(SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID))
      ).toBe(false);
      // Non-settings-backed workflows still come back.
      expect(reEnabledIds).toContain(SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID);

      await expect(service.getStatus({ request: REQUEST })).resolves.toEqual(
        expect.objectContaining({
          featureSettings: {
            continuousOnboardingEnabled: false,
            scheduledDiscoveryEnabled: false,
          },
        })
      );
    });

    it('is a no-op when not paused', async () => {
      const { api, updateWorkflow } = makeManagementApi();
      const { service, v2RulesClient } = makeService({ management: api });

      const summary = await service.resume({ request: REQUEST });

      expect(summary).toEqual({
        state: 'enabled',
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

    it('re-disables settings-backed workflows and stays paused when settings restore fails', async () => {
      const { api, updateWorkflow } = makeManagementApi();
      const { service, soClient, globalUiSettingsClient } = makeService({
        management: api,
        continuousOnboardingEnabled: true,
        scheduledDiscoveryEnabled: false,
      });

      await service.pause({ request: REQUEST });
      updateWorkflow.mockClear();

      // Workflows/rules succeed; continuous setting restore fails afterward.
      globalUiSettingsClient.set.mockImplementation(async (key: string) => {
        if (key === OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED) {
          throw new Error('set failed for continuous');
        }
      });

      const summary = await service.resume({ request: REQUEST });

      expect(summary.state).toBe('paused');
      expect(summary.partialFailures).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            target: 'settings:continuous-onboarding',
            error: expect.stringContaining('Failed to resume'),
          }),
        ])
      );

      // Continuous workflow was re-enabled, then put back off after settings failed.
      const continuousEnableCalls = updateWorkflow.mock.calls.filter(
        (call) =>
          call[0] === SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID &&
          call[1]?.enabled === true
      );
      const continuousDisableCalls = updateWorkflow.mock.calls.filter(
        (call) =>
          call[0] === SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID &&
          call[1]?.enabled === false
      );
      expect(continuousEnableCalls.length).toBeGreaterThan(0);
      expect(continuousDisableCalls.length).toBeGreaterThan(0);

      const lastWrite = soClient.create.mock.calls.at(-1)?.[1] as {
        state: string;
        disabledWorkflows: Array<{ id: string }>;
        pausedSettings?: { continuousOnboardingWasEnabled: boolean };
      };
      expect(lastWrite.state).toBe('paused');
      expect(lastWrite.pausedSettings?.continuousOnboardingWasEnabled).toBe(true);
      expect(lastWrite.disabledWorkflows.map((workflow) => workflow.id)).toContain(
        SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID
      );
    });

    it('re-disables the matching scheduled workflow when scheduled-discovery restore fails', async () => {
      const { api, updateWorkflow } = makeManagementApi();
      const { service, soClient, spaceUiSettingsClient } = makeService({
        management: api,
        continuousOnboardingEnabled: false,
        scheduledDiscoveryEnabled: true,
        internalSpaceIds: ['default', 'space-a'],
      });

      await service.pause({ request: REQUEST });
      updateWorkflow.mockClear();

      spaceUiSettingsClient.set.mockImplementation(async (key: string) => {
        if (key === OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED) {
          throw new Error('set failed for scheduled');
        }
      });

      const summary = await service.resume({ request: REQUEST });

      expect(summary.state).toBe('paused');
      expect(summary.partialFailures).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            target: expect.stringContaining('settings:scheduled-discovery@'),
            error: expect.stringContaining('Failed to resume'),
          }),
        ])
      );

      const scheduledDocId = `${SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID}-default`;
      const scheduledEnableCalls = updateWorkflow.mock.calls.filter(
        (call) => call[0] === scheduledDocId && call[1]?.enabled === true
      );
      const scheduledDisableCalls = updateWorkflow.mock.calls.filter(
        (call) => call[0] === scheduledDocId && call[1]?.enabled === false
      );
      expect(scheduledEnableCalls.length).toBeGreaterThan(0);
      expect(scheduledDisableCalls.length).toBeGreaterThan(0);

      const lastWrite = soClient.create.mock.calls.at(-1)?.[1] as {
        state: string;
        disabledWorkflows: Array<{ id: string; spaceId: string }>;
      };
      expect(lastWrite.state).toBe('paused');
      expect(lastWrite.disabledWorkflows.map((workflow) => workflow.id)).toContain(scheduledDocId);
    });

    it('rolls runtime back toward paused when resume persist fails after re-enabling', async () => {
      const { api, updateWorkflow } = makeManagementApi();
      const { service, soClient } = makeService({
        management: api,
        ruleBackedRuleIds: ['rule-1'],
        continuousOnboardingEnabled: true,
      });

      await service.pause({ request: REQUEST });
      updateWorkflow.mockClear();

      // First create after pause is the resume write — reject it.
      soClient.create.mockRejectedValueOnce(new Error('so write failed on resume'));

      await expect(service.resume({ request: REQUEST })).rejects.toThrow(
        'so write failed on resume'
      );

      // Compensating disable after the failed write.
      const disableAfterResume = updateWorkflow.mock.calls.filter(
        (call) => call[1]?.enabled === false
      );
      expect(disableAfterResume.length).toBeGreaterThan(0);
      await expect(service.getState({ request: REQUEST })).resolves.toBe('paused');
    });
  });
});
