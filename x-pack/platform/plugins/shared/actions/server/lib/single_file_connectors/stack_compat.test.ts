/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpec } from '@kbn/connector-specs';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { z } from '@kbn/zod/v4';
import { ActionTypeRegistry, type ActionTypeRegistryOpts } from '../../action_type_registry';
import { actionsConfigMock } from '../../actions_config.mock';
import { validateConfig, validateParams, validateSecrets } from '../validate_with_schema';
import { urlAllowListValidator } from '../../sub_action_framework/helpers';
import { TestConfigSchema, TestSecretsSchema } from '../../sub_action_framework/mocks';
import type { TestConfig, TestSecrets } from '../../sub_action_framework/mocks';
import { register } from '../../sub_action_framework/register';
import { SubActionConnector } from '../../sub_action_framework/sub_action_connector';
import type { ServiceParams } from '../../sub_action_framework/types';
import { ValidatorType } from '../../sub_action_framework/types';
import type { PluginSetupContract as ActionsPluginSetupContract } from '../../plugin';
import { createConnectorTypeFromSpec } from './create_connector_from_spec';

const CONNECTOR_ID = '.parity';
const CONNECTOR_NAME = 'Parity';
const FEATURE_IDS: Array<'alerting' | 'cases'> = ['alerting', 'cases'];

class ParityConnector extends SubActionConnector<TestConfig, TestSecrets> {
  constructor(params: ServiceParams<TestConfig, TestSecrets>) {
    super(params);
    this.registerSubAction({
      name: 'echo',
      method: 'echo',
      schema: z.object({ id: z.string() }),
    });
  }

  protected getResponseErrorMessage(): string {
    return 'Error';
  }

  public async echo({ id }: { id: string }) {
    return { id };
  }
}

const messageOf = (run: () => unknown): string => {
  try {
    run();
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
  throw new Error('expected a throw');
};

const toJsonSchema = (schema: unknown) => {
  const { $schema, ...jsonSchema } = z.toJSONSchema(schema as z.ZodType, {
    unrepresentable: 'any',
    io: 'input',
  }) as Record<string, unknown>;
  return jsonSchema;
};

describe('stackCompat registration parity', () => {
  const configUtils = actionsConfigMock.create();
  const logger = loggingSystemMock.createLogger();
  const services = { configurationUtilities: configUtils };

  const createRegistry = () =>
    new ActionTypeRegistry({
      licensing: { featureUsage: { register: jest.fn() } },
      taskManager: { registerTaskDefinitions: jest.fn() },
      taskRunnerFactory: { create: jest.fn() },
      actionsConfigUtils: configUtils,
      licenseState: {
        ensureLicenseForActionType() {},
        isLicenseValidForActionType: () => ({ isValid: true }),
      },
      inMemoryConnectors: [],
    } as unknown as ActionTypeRegistryOpts);

  const registerLegacy = () => {
    const registry = createRegistry();
    register<TestConfig, TestSecrets>({
      actionTypeRegistry: registry,
      configurationUtilities: configUtils,
      logger,
      connector: {
        id: CONNECTOR_ID,
        name: CONNECTOR_NAME,
        minimumLicenseRequired: 'gold',
        supportedFeatureIds: FEATURE_IDS,
        schema: {
          config: TestConfigSchema,
          secrets: TestSecretsSchema,
        },
        validators: [{ type: ValidatorType.CONFIG, validator: urlAllowListValidator('url') }],
        getService: (params) => new ParityConnector(params),
      },
    });
    return registry;
  };

  const registerCompat = () => {
    const registry = createRegistry();
    const spec: ConnectorSpec = {
      metadata: {
        id: CONNECTOR_ID,
        displayName: CONNECTOR_NAME,
        description: 'must not leak',
        minimumLicense: 'gold',
        supportedFeatureIds: FEATURE_IDS,
        isTechnicalPreview: true,
      },
      actions: {
        echo: {
          scope: 'read',
          input: z.object({ id: z.string() }),
          handler: jest.fn(),
        },
      },
      test: { handler: jest.fn(), enabled: false },
      stackCompat: {
        configSchema: TestConfigSchema,
        secretsSchema: TestSecretsSchema,
        allowedHostsKeys: ['url'],
      },
    };
    const actions = {
      getActionsConfigurationUtilities: () => configUtils,
      getAxiosInstanceWithAuth: jest.fn(),
      getCredential: jest.fn(),
      getClientLeasePool: jest.fn().mockReturnValue({ lease: jest.fn() }),
    } as unknown as ActionsPluginSetupContract;

    registry.register(createConnectorTypeFromSpec(spec, actions));
    return registry;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    configUtils.getWebhookSettings.mockReturnValue({ ssl: { pfx: { enabled: false } } });
  });

  it('lists the same public type row', () => {
    expect(registerCompat().list()).toEqual(registerLegacy().list());
  });

  it('exposes the same config, secrets, and params JSON schemas', () => {
    const legacy = registerLegacy().get(CONNECTOR_ID);
    const compat = registerCompat().get(CONNECTOR_ID);

    if (!compat.validate.params || !legacy.validate.params) {
      throw new Error('expected params validators');
    }

    expect(toJsonSchema(compat.validate.config.schema)).toEqual(
      toJsonSchema(legacy.validate.config.schema)
    );
    expect(toJsonSchema(compat.validate.secrets.schema)).toEqual(
      toJsonSchema(legacy.validate.secrets.schema)
    );
    expect(toJsonSchema(compat.validate.params.schema)).toEqual(
      toJsonSchema(legacy.validate.params.schema)
    );
  });

  it('validates the same allowed and rejected inputs', () => {
    const legacy = registerLegacy().get(CONNECTOR_ID);
    const compat = registerCompat().get(CONNECTOR_ID);

    const allowedConfig = { url: 'https://example.com', extra: true };
    const allowedSecrets = { username: 'user', password: 'pass', authType: 'bearer' };
    const allowedParams = { subAction: 'echo', subActionParams: { id: '1', extra: true } };
    const defaultedParams = { subAction: 'other' };

    expect(validateConfig(compat, allowedConfig, services)).toEqual(
      validateConfig(legacy, allowedConfig, services)
    );
    expect(validateSecrets(compat, allowedSecrets, services)).toEqual(
      validateSecrets(legacy, allowedSecrets, services)
    );
    expect(validateParams(compat, allowedParams, services)).toEqual(
      validateParams(legacy, allowedParams, services)
    );
    expect(validateParams(compat, defaultedParams, services)).toEqual(
      validateParams(legacy, defaultedParams, services)
    );

    const rejected = [
      () => validateConfig(legacy, {}, services),
      () => validateConfig(compat, {}, services),
      () => validateSecrets(legacy, { username: 'user' }, services),
      () => validateSecrets(compat, { username: 'user' }, services),
      () => validateParams(legacy, { subAction: 'echo', subActionParams: 'nope' }, services),
      () => validateParams(compat, { subAction: 'echo', subActionParams: 'nope' }, services),
      () => validateParams(legacy, {}, services),
      () => validateParams(compat, {}, services),
    ];

    expect(messageOf(rejected[1])).toBe(messageOf(rejected[0]));
    expect(messageOf(rejected[3])).toBe(messageOf(rejected[2]));
    expect(messageOf(rejected[5])).toBe(messageOf(rejected[4]));
    expect(messageOf(rejected[7])).toBe(messageOf(rejected[6]));
  });

  it('rejects a disallowed URL with the same message', () => {
    configUtils.ensureUriAllowed.mockImplementation(() => {
      throw new Error('target url is not present in allowedHosts');
    });

    const legacy = registerLegacy().get(CONNECTOR_ID);
    const compat = registerCompat().get(CONNECTOR_ID);
    const config = { url: 'https://not-allowed.example.com' };

    expect(messageOf(() => validateConfig(compat, config, services))).toBe(
      messageOf(() => validateConfig(legacy, config, services))
    );
  });
});
