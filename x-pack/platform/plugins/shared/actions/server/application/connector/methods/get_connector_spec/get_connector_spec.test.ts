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
import type { ActionType } from '../../../../../common';
import type { ActionsClientContext } from '../../../../actions_client';
import type { ActionsConfigurationUtilities } from '../../../../actions_config';
import { actionsAuthorizationMock } from '../../../../authorization/actions_authorization.mock';
import { actionTypeRegistryMock } from '../../../../action_type_registry.mock';
import { getConnectorSpecAsJsonSchema } from './get_connector_spec';

const authorization = actionsAuthorizationMock.create();
const auditLogger = auditLoggerMock.create();
const actionTypeRegistry = actionTypeRegistryMock.create();

const stubNoTest = {
  metadata: {
    id: '.stub-no-test',
    displayName: 'Stub (no test)',
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

const specsById: Record<string, ConnectorSpec> = {
  ...Object.fromEntries(Object.values(connectorsSpecs).map((spec) => [spec.metadata.id, spec])),
  [stubNoTest.metadata.id]: stubNoTest,
  [stubExperimentalEars.metadata.id]: stubExperimentalEars,
  [catalogOnly.metadata.id]: catalogOnly,
};

const listRow = (spec: ConnectorSpec): ActionType => ({
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

function createContext(): ActionsClientContext {
  return { authorization, auditLogger, actionTypeRegistry } as unknown as ActionsClientContext;
}

describe('getConnectorSpecAsJsonSchema', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authorization.ensureAuthorized.mockResolvedValue(undefined);
    actionTypeRegistry.getSpec.mockImplementation((id: string) => specsById[id]);
    actionTypeRegistry.list.mockReturnValue([
      ...Object.values(specsById).map(listRow),
      serverLogRow,
    ]);
  });

  describe('authorization', () => {
    test('ensures user is authorised to get actions before returning a connector type spec', async () => {
      await getConnectorSpecAsJsonSchema({
        context: createContext(),
        id: '.alienvault-otx',
        configurationUtilities,
      });

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'get' });
    });

    test('throws when user is not authorised to get actions', async () => {
      authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized to get actions'));

      await expect(
        getConnectorSpecAsJsonSchema({
          context: createContext(),
          id: '.alienvault-otx',
          configurationUtilities,
        })
      ).rejects.toMatchInlineSnapshot(`[Error: Unauthorized to get actions]`);

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'get' });
    });

    test('does not look up the spec when authorization fails', async () => {
      authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized to get actions'));

      await expect(
        getConnectorSpecAsJsonSchema({
          context: createContext(),
          id: '.alienvault-otx',
          configurationUtilities,
        })
      ).rejects.toThrow();

      expect(actionTypeRegistry.getSpec).not.toHaveBeenCalled();
    });
  });

  describe('auditLogger', () => {
    test('logs audit event when not authorised to get a connector type spec', async () => {
      authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

      await expect(
        getConnectorSpecAsJsonSchema({
          context: createContext(),
          id: '.alienvault-otx',
          configurationUtilities,
        })
      ).rejects.toThrow();

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'connector_get',
            outcome: 'failure',
          }),
          error: { code: 'Error', message: 'Unauthorized' },
        })
      );
    });
  });

  it('returns serialized spec when the connector type exists', async () => {
    const result = await getConnectorSpecAsJsonSchema({
      context: createContext(),
      id: '.alienvault-otx',
      configurationUtilities,
    });
    expect(result).toHaveProperty('metadata');
    expect(result.metadata).toHaveProperty('id', '.alienvault-otx');
    expect(result.metadata).toHaveProperty('displayName');
    expect(result.metadata).toHaveProperty('supportedFeatureIds');
    expect(result).toHaveProperty('schema');
    expect(result).toHaveProperty('actions');
    expect(Array.isArray(result.actions)).toBe(true);
  });

  it('returns actions with name and isTool fields', async () => {
    const result = await getConnectorSpecAsJsonSchema({
      context: createContext(),
      id: '.pagerduty_mcp',
      configurationUtilities,
    });
    expect(result.actions.length).toBeGreaterThan(0);
    for (const action of result.actions) {
      expect(action).toHaveProperty('name');
      expect(typeof action.name).toBe('string');
      expect(action).toHaveProperty('isTool');
      expect(typeof action.isTool).toBe('boolean');
      expect(action).not.toHaveProperty('inputSchema');
    }
  });

  it('returns isTestable true when the spec opts in to testing', async () => {
    const result = await getConnectorSpecAsJsonSchema({
      context: createContext(),
      id: '.abuseipdb',
      configurationUtilities,
    });
    expect(result).toHaveProperty('isTestable', true);
  });

  it('returns isTestable false when the spec does not opt in to testing', async () => {
    const result = await getConnectorSpecAsJsonSchema({
      context: createContext(),
      id: '.stub-no-test',
      configurationUtilities,
    });
    expect(result).toHaveProperty('isTestable', false);
  });

  it('rejects with 404 when the connector type has no spec', async () => {
    await expect(
      getConnectorSpecAsJsonSchema({
        context: createContext(),
        id: '__no_such_spec_connector__',
        configurationUtilities,
      })
    ).rejects.toMatchObject({ output: { statusCode: 404 } });
  });

  it('resolves a spec registered at runtime that is not in the bundled map', async () => {
    const result = await getConnectorSpecAsJsonSchema({
      context: createContext(),
      id: '.catalog-only',
      configurationUtilities,
    });

    expect(result.metadata).toHaveProperty('id', '.catalog-only');
    expect(result).toHaveProperty('isTestable', true);
    expect(result.actions).toHaveLength(1);
    expect(actionTypeRegistry.getSpec).toHaveBeenCalledWith('.catalog-only');
  });

  it('rejects with 404 for a classic connector type without a spec', async () => {
    await expect(
      getConnectorSpecAsJsonSchema({
        context: createContext(),
        id: '.server-log',
        configurationUtilities,
      })
    ).rejects.toMatchObject({ output: { statusCode: 404 } });
  });

  it('excludes experimental EARS auth types when isEarsExperimentalEnabled is false', async () => {
    const earsEnabledUtils = {
      getWebhookSettings: () => ({ ssl: { pfx: { enabled: true } } }),
      isEarsEnabled: () => true,
      isEarsExperimentalEnabled: () => false,
    } as unknown as ActionsConfigurationUtilities;

    const result = await getConnectorSpecAsJsonSchema({
      context: createContext(),
      id: '.stub-experimental-ears',
      configurationUtilities: earsEnabledUtils,
    });

    const schemaJson = result.schema as {
      properties?: {
        secrets?: { oneOf?: Array<{ properties?: { authType?: { const?: string } } }> };
      };
    };
    const secretsOneOf = schemaJson.properties?.secrets?.oneOf || [];
    const authTypes = secretsOneOf
      .map((opt) => opt.properties?.authType?.const)
      .filter(Boolean) as string[];

    expect(authTypes).not.toContain('ears');
  });

  it('includes stable (non-experimental) EARS auth types even when isEarsExperimentalEnabled is false', async () => {
    const earsEnabledUtils = {
      getWebhookSettings: () => ({ ssl: { pfx: { enabled: true } } }),
      isEarsEnabled: () => true,
      isEarsExperimentalEnabled: () => false,
    } as unknown as ActionsConfigurationUtilities;

    const result = await getConnectorSpecAsJsonSchema({
      context: createContext(),
      id: '.google_calendar',
      configurationUtilities: earsEnabledUtils,
    });

    const schemaJson = result.schema as {
      properties?: {
        secrets?: { oneOf?: Array<{ properties?: { authType?: { const?: string } } }> };
      };
    };
    const secretsOneOf = schemaJson.properties?.secrets?.oneOf || [];
    const authTypes = secretsOneOf
      .map((opt) => opt.properties?.authType?.const)
      .filter(Boolean) as string[];

    expect(authTypes).toContain('ears');
  });

  it('includes experimental EARS auth types when isEarsExperimentalEnabled is true', async () => {
    const earsEnabledUtils = {
      getWebhookSettings: () => ({ ssl: { pfx: { enabled: true } } }),
      isEarsEnabled: () => true,
      isEarsExperimentalEnabled: () => true,
    } as unknown as ActionsConfigurationUtilities;

    const result = await getConnectorSpecAsJsonSchema({
      context: createContext(),
      id: '.stub-experimental-ears',
      configurationUtilities: earsEnabledUtils,
    });

    const schemaJson = result.schema as {
      properties?: {
        secrets?: { oneOf?: Array<{ properties?: { authType?: { const?: string } } }> };
      };
    };
    const secretsOneOf = schemaJson.properties?.secrets?.oneOf || [];
    const authTypes = secretsOneOf
      .map((opt) => opt.properties?.authType?.const)
      .filter(Boolean) as string[];

    expect(authTypes).toContain('ears');
  });
});
