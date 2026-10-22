/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import type { ConnectorSpec } from '@kbn/connector-specs';
import { connectorsSpecs } from '@kbn/connector-specs';
import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';
import { z as z4 } from '@kbn/zod/v4';
import type { ActionType } from '../../common';
import type { ActionTypeRegistry } from '../action_type_registry';
import { actionTypeRegistryMock } from '../action_type_registry.mock';
import { actionsConfigMock } from '../actions_config.mock';
import { actionsAuthorizationMock } from '../authorization/actions_authorization.mock';
import { SpecsClient } from './specs_client';
import type { SpecsClientOpts } from './types';
import { createActionType, createSpec } from './test_utils';

const authorization = actionsAuthorizationMock.create();
const auditLogger = auditLoggerMock.create();
const actionTypeRegistry = actionTypeRegistryMock.create();

const catalogOnly = createSpec({
  metadata: {
    id: '.catalog-only',
    displayName: 'Catalog Only',
    description: 'Runtime-registered spec',
    minimumLicense: 'basic',
    supportedFeatureIds: [],
  },
  auth: null,
  schema: null,
  actions: {
    catalogAction: {
      scope: 'read',
      input: z4.object({}),
      handler: async () => ({}),
    },
  },
  test: { handler: async () => ({}), enabled: true },
});

const specsById: Record<string, ConnectorSpec> = {
  ...Object.fromEntries(Object.values(connectorsSpecs).map((spec) => [spec.metadata.id, spec])),
  [catalogOnly.metadata.id]: catalogOnly,
};

const listRow = (spec: ConnectorSpec, overrides: Partial<ActionType> = {}): ActionType =>
  createActionType(spec.metadata.id, {
    name: spec.metadata.displayName,
    minimumLicenseRequired: spec.metadata.minimumLicense,
    supportedFeatureIds: spec.metadata.supportedFeatureIds,
    ...overrides,
  });

const serverLogRow = createActionType('.server-log', {
  name: 'Server log',
  minimumLicenseRequired: 'basic',
  supportedFeatureIds: ['alerting'],
  source: ACTION_TYPE_SOURCES.stack,
});

const configurationUtilities = actionsConfigMock.create();

const createClient = (opts: Partial<SpecsClientOpts> = {}) =>
  new SpecsClient({
    actionTypeRegistry: actionTypeRegistry as unknown as ActionTypeRegistry,
    configurationUtilities,
    authorization,
    auditLogger,
    ...opts,
  });

describe('SpecsClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authorization.ensureAuthorized.mockResolvedValue(undefined);
    actionTypeRegistry.getSpec.mockImplementation((id: string) => specsById[id]);
    actionTypeRegistry.list.mockReturnValue([
      ...Object.values(specsById).map((spec) => listRow(spec)),
      serverLogRow,
    ]);
  });

  describe('get', () => {
    it('returns every detail field for a bundled spec', async () => {
      const detail = await createClient().get({ id: '.alienvault-otx' });
      expect(detail.id).toBe('.alienvault-otx');
      expect(detail.displayName).toEqual(expect.any(String));
      expect(detail.description).toEqual(expect.any(String));
      expect(detail.formSchema).toEqual(expect.any(Object));
      expect(Array.isArray(detail.actions)).toBe(true);
      expect(JSON.parse(JSON.stringify(detail))).toEqual(detail);
    });

    it('returns detail for a catalog-only spec', async () => {
      const detail = await createClient().get({ id: '.catalog-only' });
      expect(detail.id).toBe('.catalog-only');
      expect(detail.isTestable).toBe(true);
      expect(detail.actions).toHaveLength(1);
      expect(detail.actions[0].inputSchema).toEqual(expect.any(Object));
      expect(actionTypeRegistry.getSpec).toHaveBeenCalledWith('.catalog-only');
    });

    it('rejects with 404 when the connector type is unknown', async () => {
      await expect(createClient().get({ id: '__no_such_spec_connector__' })).rejects.toMatchObject({
        output: { statusCode: 404 },
      });
    });

    it('rejects with 404 for a classic connector type without a spec', async () => {
      await expect(createClient().get({ id: '.server-log' })).rejects.toMatchObject({
        output: { statusCode: 404 },
      });
    });

    describe('authorization', () => {
      it('ensures the user is authorised to get before looking up a spec', async () => {
        await createClient().get({ id: '.alienvault-otx' });
        expect(authorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'get' });
      });

      it('rethrows, logs connector_get failure, and does not call getSpec when unauthorized', async () => {
        authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

        await expect(createClient().get({ id: '.alienvault-otx' })).rejects.toMatchInlineSnapshot(
          `[Error: Unauthorized]`
        );

        expect(auditLogger.log).toHaveBeenCalledWith(
          expect.objectContaining({
            event: expect.objectContaining({
              action: 'connector_get',
              outcome: 'failure',
            }),
            error: { code: 'Error', message: 'Unauthorized' },
          })
        );
        expect(actionTypeRegistry.getSpec).not.toHaveBeenCalled();
      });

      it('still rejects without an audit logger and does not call getSpec when unauthorized', async () => {
        authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

        await expect(
          createClient({ auditLogger: undefined }).get({ id: '.catalog-only' })
        ).rejects.toMatchInlineSnapshot(`[Error: Unauthorized]`);

        expect(auditLogger.log).not.toHaveBeenCalled();
        expect(actionTypeRegistry.getSpec).not.toHaveBeenCalled();
      });
    });
  });

  describe('getAll', () => {
    const workflowsSpec = createSpec({
      metadata: {
        id: '.stub-workflows',
        displayName: 'Stub Workflows',
        description: 'Workflows feature spec',
        minimumLicense: 'gold',
        supportedFeatureIds: ['workflows'],
      },
      actions: {
        run: {
          scope: 'write',
          input: z4.object({}),
          handler: async () => ({}),
        },
      },
      skill: 'Do not leak this into summaries.',
    });

    const agentBuilderSpec = createSpec({
      metadata: {
        id: '.stub-agent-builder',
        displayName: 'Stub Agent Builder',
        description: 'Agent Builder feature spec',
        minimumLicense: 'gold',
        supportedFeatureIds: ['agentBuilder'],
      },
    });

    const missingSpecRow: ActionType = createActionType('.missing-spec', {
      name: 'Missing spec',
      minimumLicenseRequired: 'gold',
      supportedFeatureIds: ['workflows'],
    });

    beforeEach(() => {
      const workflowsRow = listRow(workflowsSpec);
      const agentBuilderRow = listRow(agentBuilderSpec);
      const getAllRows = [serverLogRow, workflowsRow, agentBuilderRow, missingSpecRow];

      actionTypeRegistry.getSpec.mockImplementation((id: string) => {
        if (id === workflowsSpec.metadata.id) {
          return workflowsSpec;
        }
        if (id === agentBuilderSpec.metadata.id) {
          return agentBuilderSpec;
        }
        return undefined;
      });
      actionTypeRegistry.list.mockImplementation((opts?: { featureId?: string }) => {
        const { featureId } = opts ?? {};
        return featureId
          ? getAllRows.filter((row) => row.supportedFeatureIds.includes(featureId))
          : getAllRows;
      });
    });

    it('returns summaries for spec-backed types only', async () => {
      const summaries = await createClient().getAll();
      expect(summaries.map((summary) => summary.id)).toEqual([
        '.stub-workflows',
        '.stub-agent-builder',
      ]);
    });

    it('filters by featureId', async () => {
      const workflows = await createClient().getAll({ featureId: 'workflows' });
      expect(workflows.map((summary) => summary.id)).toEqual(['.stub-workflows']);

      const none = await createClient().getAll({ featureId: 'nope' });
      expect(none).toEqual([]);
    });

    describe('authorization', () => {
      it('ensures the user is authorised to get before listing specs', async () => {
        await createClient().getAll();
        expect(authorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'get' });
      });

      it('rethrows, logs connector_get failure, and does not call list when unauthorized', async () => {
        authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

        await expect(createClient().getAll()).rejects.toMatchInlineSnapshot(
          `[Error: Unauthorized]`
        );

        expect(auditLogger.log).toHaveBeenCalledWith(
          expect.objectContaining({
            event: expect.objectContaining({
              action: 'connector_get',
              outcome: 'failure',
            }),
            error: { code: 'Error', message: 'Unauthorized' },
          })
        );
        expect(actionTypeRegistry.list).not.toHaveBeenCalled();
      });
    });
  });
});
