/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import type { ActionsClientContext } from '../../../../actions_client';
import type { ActionsConfigurationUtilities } from '../../../../actions_config';
import { actionsAuthorizationMock } from '../../../../authorization/actions_authorization.mock';
import { getConnectorSpecAsJsonSchema } from './get_connector_spec';

const authorization = actionsAuthorizationMock.create();
const auditLogger = auditLoggerMock.create();

const configurationUtilities = {
  getWebhookSettings: () => ({ ssl: { pfx: { enabled: true } } }),
  isEarsEnabled: () => false,
  isEarsExperimentalEnabled: () => false,
} as unknown as ActionsConfigurationUtilities;

function createContext(): ActionsClientContext {
  return { authorization, auditLogger } as unknown as ActionsClientContext;
}

describe('getConnectorSpecAsJsonSchema', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authorization.ensureAuthorized.mockResolvedValue(undefined);
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
      id: '.alienvault-otx',
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

  it('excludes experimental EARS auth types when isEarsExperimentalEnabled is false', async () => {
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
      id: '.microsoft-teams',
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
});
