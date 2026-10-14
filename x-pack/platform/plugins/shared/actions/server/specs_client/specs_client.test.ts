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
import type { ActionsConfigurationUtilities } from '../actions_config';
import { actionsAuthorizationMock } from '../authorization/actions_authorization.mock';
import { SpecsClient } from './specs_client';
import type { SpecsClientAccess } from './types';

const authorization = actionsAuthorizationMock.create();
const auditLogger = auditLoggerMock.create();
const actionTypeRegistry = actionTypeRegistryMock.create();

const stubNoTest = {
  metadata: {
    id: '.stub-no-test',
    displayName: 'Stub (no test)',
    description: 'No test handler',
    minimumLicense: 'basic',
    supportedFeatureIds: [],
  },
  auth: null,
  schema: null,
  actions: {},
  test: { handler: async () => ({}), enabled: false },
} as unknown as ConnectorSpec;

const stubExperimentalEars = {
  metadata: {
    id: '.stub-experimental-ears',
    displayName: 'Stub (experimental EARS)',
    description: 'Experimental EARS auth',
    minimumLicense: 'basic',
    supportedFeatureIds: [],
  },
  auth: {
    types: [{ type: 'ears', isExperimental: true, defaults: {} }],
  },
  schema: null,
  actions: {},
  test: { handler: async () => ({}), enabled: true },
} as unknown as ConnectorSpec;

const catalogOnly = {
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
} as unknown as ConnectorSpec;

const stubEventsOnly = {
  metadata: {
    id: '.stub-events-only',
    displayName: 'Stub Events Only',
    description: 'Inbound-only stub',
    minimumLicense: 'basic',
    supportedFeatureIds: [],
  },
  auth: null,
  schema: null,
  actions: {},
  events: {
    definitions: {
      ping: {
        eventId: '.stub-events-only.ping',
        title: 'Ping',
        description: 'Ping event',
        eventSchema: z4.object({}),
      },
    },
    handleEvents: async () => ({}),
  },
  test: { handler: async () => ({}), enabled: false },
} as unknown as ConnectorSpec;

const specsById: Record<string, ConnectorSpec> = {
  ...Object.fromEntries(Object.values(connectorsSpecs).map((spec) => [spec.metadata.id, spec])),
  [stubNoTest.metadata.id]: stubNoTest,
  [stubExperimentalEars.metadata.id]: stubExperimentalEars,
  [catalogOnly.metadata.id]: catalogOnly,
  [stubEventsOnly.metadata.id]: stubEventsOnly,
};

const listRow = (spec: ConnectorSpec, overrides: Partial<ActionType> = {}): ActionType => ({
  id: spec.metadata.id,
  name: spec.metadata.displayName,
  enabled: true,
  enabledInConfig: true,
  enabledInLicense: true,
  minimumLicenseRequired: spec.metadata.minimumLicense,
  supportedFeatureIds: spec.metadata.supportedFeatureIds,
  isSystemActionType: false,
  source: ACTION_TYPE_SOURCES.spec,
  isDeprecated: false,
  ...overrides,
});

const serverLogRow: ActionType = {
  id: '.server-log',
  name: 'Server log',
  enabled: true,
  enabledInConfig: true,
  enabledInLicense: true,
  minimumLicenseRequired: 'basic',
  supportedFeatureIds: ['alerting'],
  isSystemActionType: false,
  source: ACTION_TYPE_SOURCES.stack,
  isDeprecated: false,
};

const configurationUtilities = {
  getWebhookSettings: () => ({ ssl: { pfx: { enabled: true } } }),
  isEarsEnabled: () => false,
  isEarsExperimentalEnabled: () => false,
} as unknown as ActionsConfigurationUtilities;

const requestAccess: SpecsClientAccess = {
  kind: 'request',
  authorization,
  auditLogger,
};

const createClient = (access: SpecsClientAccess = requestAccess) =>
  new SpecsClient({
    actionTypeRegistry: actionTypeRegistry as unknown as ActionTypeRegistry,
    configurationUtilities,
    access,
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

    it('isEarsExperimental only for the experimental EARS stub', async () => {
      const experimental = await createClient().get({ id: '.stub-experimental-ears' });
      const catalog = await createClient().get({ id: '.catalog-only' });
      expect(experimental.isEarsExperimental).toBe(true);
      expect(catalog.isEarsExperimental).toBe(false);
    });

    it('marks an events-only stub as inbound-only with events', async () => {
      const detail = await createClient().get({ id: '.stub-events-only' });
      expect(detail.hasInboundEvents).toBe(true);
      expect(detail.isInboundOnly).toBe(true);
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

    describe('request mode', () => {
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
    });

    describe('internal mode', () => {
      it('returns detail without an authorization object and does not log', async () => {
        const detail = await createClient({ kind: 'internal' }).get({ id: '.catalog-only' });
        expect(detail.id).toBe('.catalog-only');
        expect(authorization.ensureAuthorized).not.toHaveBeenCalled();
        expect(auditLogger.log).not.toHaveBeenCalled();
      });
    });
  });
});
