/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionContext, ConnectorSpec } from '@kbn/connector-specs';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { getErrorSource, TaskErrorSource } from '@kbn/task-manager-plugin/server/task_running';
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
import { actionsMock } from '../../mocks';
import type { PluginSetupContract as ActionsPluginSetupContract } from '../../plugin';
import { createConnectorTypeFromSpec } from './create_connector_from_spec';

const CONNECTOR_ID = '.parity';
const CONNECTOR_NAME = 'Parity';
const FEATURE_IDS: Array<'alerting' | 'cases'> = ['alerting', 'cases'];
const echoInput = z.object({ id: z.string() });
const rawError = new Error('downstream failed');
const seen = {
  legacyCollector: undefined as unknown,
  compatCollector: undefined as unknown,
};

class ParityConnector extends SubActionConnector<TestConfig, TestSecrets> {
  constructor(params: ServiceParams<TestConfig, TestSecrets>) {
    super(params);
    this.registerSubAction({
      name: 'echo',
      method: 'echo',
      schema: echoInput,
    });
    this.registerSubAction({
      name: 'fail',
      method: 'fail',
      schema: null,
    });
  }

  protected getResponseErrorMessage(): string {
    return 'Error';
  }

  public async echo({ id }: { id: string }, connectorUsageCollector?: unknown) {
    seen.legacyCollector = connectorUsageCollector;
    return { id };
  }

  public async fail() {
    throw rawError;
  }
}

const compatEcho = async (ctx: ActionContext, input: { id: string }) => {
  seen.compatCollector = ctx.connectorUsageCollector;
  return { id: input.id };
};

const compatFail = async () => {
  throw rawError;
};

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
          input: echoInput,
          handler: compatEcho,
        },
        fail: {
          scope: 'read',
          input: z.object({}).passthrough(),
          handler: compatFail,
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

describe('stackCompat execution parity', () => {
  const configUtils = actionsConfigMock.create();
  const logger = loggingSystemMock.createLogger();
  const actionServices = actionsMock.createServices();
  const collector = { addRequestBodyBytes: jest.fn() };
  const config = { url: 'https://example.com' };
  const secrets = { username: 'user', password: 'pass' };

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

  const executors = () => {
    const legacyRegistry = createRegistry();
    register<TestConfig, TestSecrets>({
      actionTypeRegistry: legacyRegistry,
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

    const compatRegistry = createRegistry();
    const spec: ConnectorSpec = {
      metadata: {
        id: CONNECTOR_ID,
        displayName: CONNECTOR_NAME,
        description: 'must not leak',
        minimumLicense: 'gold',
        supportedFeatureIds: FEATURE_IDS,
      },
      actions: {
        echo: {
          scope: 'read',
          input: echoInput,
          handler: compatEcho,
        },
        fail: {
          scope: 'read',
          input: z.object({}).passthrough(),
          handler: compatFail,
        },
      },
      test: { handler: async () => ({}), enabled: false },
      stackCompat: {
        configSchema: TestConfigSchema,
        secretsSchema: TestSecretsSchema,
        allowedHostsKeys: ['url'],
      },
    };
    const actions = {
      getActionsConfigurationUtilities: () => configUtils,
      getAxiosInstanceWithAuth: jest.fn().mockResolvedValue({}),
      getCredential: jest.fn(),
      getClientLeasePool: jest.fn().mockReturnValue({ acquire: jest.fn() }),
    } as unknown as ActionsPluginSetupContract;
    compatRegistry.register(createConnectorTypeFromSpec(spec, actions));

    return {
      legacy: legacyRegistry.get(CONNECTOR_ID).executor,
      compat: compatRegistry.get(CONNECTOR_ID).executor,
    };
  };

  const run = (
    executor: ReturnType<typeof executors>['legacy'],
    params: { subAction: string; subActionParams?: Record<string, unknown> }
  ) =>
    executor!({
      actionId: 'connector-1',
      params,
      config,
      secrets,
      services: actionServices,
      configurationUtilities: configUtils,
      logger,
      connectorUsageCollector: collector as never,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    seen.legacyCollector = undefined;
    seen.compatCollector = undefined;
    configUtils.getWebhookSettings.mockReturnValue({ ssl: { pfx: { enabled: false } } });
  });

  it('returns the same success result and forwards the collector', async () => {
    const { legacy, compat } = executors();
    const params = { subAction: 'echo', subActionParams: { id: '1' } };

    await expect(run(compat, params)).resolves.toEqual(await run(legacy, params));
    expect(seen.legacyCollector).toBe(collector);
    expect(seen.compatCollector).toBe(collector);
  });

  it('throws the same unknown sub-action message', async () => {
    const { legacy, compat } = executors();
    const params = { subAction: 'missing', subActionParams: {} };

    const legacyError = await run(legacy, params).catch((err) => err);
    const compatError = await run(compat, params).catch((err) => err);

    expect(compatError.message).toBe(legacyError.message);
  });

  it('throws the same validation message and user error source', async () => {
    const { legacy, compat } = executors();
    const params = { subAction: 'echo', subActionParams: {} };
    const legacyError = await run(legacy, params).catch((err) => err);
    const compatError = await run(compat, params).catch((err) => err);

    expect(compatError.message).toBe(legacyError.message);
    expect(compatError.message).toContain('Request validation failed (');
    expect(getErrorSource(compatError)).toBe(getErrorSource(legacyError));
    expect(getErrorSource(compatError)).toBe(TaskErrorSource.USER);
  });

  it('rethrows a handler error without wrapping it', async () => {
    const { legacy, compat } = executors();
    const params = { subAction: 'fail', subActionParams: {} };

    await expect(run(legacy, params)).rejects.toBe(rawError);
    await expect(run(compat, params)).rejects.toBe(rawError);
  });
});
