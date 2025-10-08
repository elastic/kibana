/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskCost } from '@kbn/task-manager-plugin/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { schema } from '@kbn/config-schema';
import type { ConnectorTypeRegistryOpts } from './connector_type_registry';
import { ConnectorTypeRegistry } from './connector_type_registry';
import type { ActionType as ConnectorType, ExecutorType } from './types';
import type { ILicenseState } from './lib';
import { ActionExecutionSourceType, ActionExecutor, TaskRunnerFactory } from './lib';
import { actionsConfigMock } from './actions_config.mock';
import { licenseStateMock } from './lib/license_state.mock';
import type { ActionsConfigurationUtilities } from './actions_config';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { inMemoryMetricsMock } from './monitoring/in_memory_metrics.mock';
import { ConnectorRateLimiter } from './lib/connector_rate_limiter';

const mockTaskManager = taskManagerMock.createSetup();
const inMemoryMetrics = inMemoryMetricsMock.create();
let mockedLicenseState: jest.Mocked<ILicenseState>;
let mockedActionsConfig: jest.Mocked<ActionsConfigurationUtilities>;
let connectorTypeRegistryParams: ConnectorTypeRegistryOpts;

describe('ConnectorTypeRegistry', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedLicenseState = licenseStateMock.create();
    mockedActionsConfig = actionsConfigMock.create();
    connectorTypeRegistryParams = {
      licensing: licensingMock.createSetup(),
      taskManager: mockTaskManager,
      taskRunnerFactory: new TaskRunnerFactory(
        new ActionExecutor({
          isESOCanEncrypt: true,
          connectorRateLimiter: new ConnectorRateLimiter({
            config: { email: { limit: 100, lookbackWindow: '1m' } },
          }),
        }),
        inMemoryMetrics
      ),
      actionsConfigUtils: mockedActionsConfig,
      licenseState: mockedLicenseState,
      inMemoryConnectors: [
        {
          actionTypeId: 'foo',
          config: {},
          id: 'my-slack1',
          name: 'Slack #xyz',
          secrets: {},
          isPreconfigured: true,
          isDeprecated: false,
          isSystemAction: false,
        },
        {
          actionTypeId: 'test.system-connector',
          config: {},
          id: 'system-connector-test.system-connector',
          name: 'System action: test.system-connector',
          secrets: {},
          isPreconfigured: false,
          isDeprecated: false,
          isSystemAction: true,
        },
      ],
    };
  });

  const executor: ExecutorType<{}, {}, {}, void> = async (options) => {
    return { status: 'ok', actionId: options.actionId };
  };

  describe('register()', () => {
    test('able to register connector types', () => {
      const connectorTypeRegistry = new ConnectorTypeRegistry(connectorTypeRegistryParams);
      connectorTypeRegistry.register<{}, {}, {}, void>({
        id: 'my-connector-type',
        name: 'My connector type',
        minimumLicenseRequired: 'gold',
        supportedFeatureIds: ['alerting'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        executor,
      });
      expect(connectorTypeRegistry.has('my-connector-type')).toEqual(true);
      expect(mockTaskManager.registerTaskDefinitions).toHaveBeenCalledTimes(1);
      expect(mockTaskManager.registerTaskDefinitions.mock.calls[0]).toEqual(
        expect.objectContaining([
          {
            'actions:my-connector-type': {
              createTaskRunner: expect.any(Function),
              maxAttempts: 3,
              cost: TaskCost.Tiny,
              title: 'My connector type',
            },
          },
        ])
      );
      expect(connectorTypeRegistryParams.licensing.featureUsage.register).toHaveBeenCalledWith(
        'Connector: My connector type',
        'gold'
      );
    });

    test('shallow clones the given connector type', () => {
      const myType: ConnectorType = {
        id: 'my-connector-type',
        name: 'My connector type',
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        executor,
      };
      const connectorTypeRegistry = new ConnectorTypeRegistry(connectorTypeRegistryParams);
      connectorTypeRegistry.register(myType);
      myType.name = 'Changed';
      expect(connectorTypeRegistry.get('my-connector-type').name).toEqual('My connector type');
    });

    test('throws error if connector type already registered', () => {
      const connectorTypeRegistry = new ConnectorTypeRegistry(connectorTypeRegistryParams);
      connectorTypeRegistry.register({
        id: 'my-connector-type',
        name: 'My connector type',
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        executor,
      });
      expect(() =>
        connectorTypeRegistry.register({
          id: 'my-connector-type',
          name: 'My connector type',
          minimumLicenseRequired: 'basic',
          supportedFeatureIds: ['alerting'],
          validate: {
            config: { schema: schema.object({}) },
            secrets: { schema: schema.object({}) },
            params: { schema: schema.object({}) },
          },
          executor,
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Action type \\"my-connector-type\\" is already registered."`
      );
    });

    test('throws if empty supported feature ids provided', () => {
      const connectorTypeRegistry = new ConnectorTypeRegistry(connectorTypeRegistryParams);
      expect(() =>
        connectorTypeRegistry.register({
          id: 'my-connector-type',
          name: 'My connector type',
          minimumLicenseRequired: 'basic',
          supportedFeatureIds: [],
          validate: {
            config: { schema: schema.object({}) },
            secrets: { schema: schema.object({}) },
            params: { schema: schema.object({}) },
          },
          executor,
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"At least one \\"supportedFeatureId\\" value must be supplied for connector type \\"my-connector-type\\"."`
      );
    });

    test('throws if invalid feature ids provided', () => {
      const connectorTypeRegistry = new ConnectorTypeRegistry(connectorTypeRegistryParams);
      expect(() =>
        connectorTypeRegistry.register({
          id: 'my-connector-type',
          name: 'My connector type',
          minimumLicenseRequired: 'basic',
          supportedFeatureIds: ['foo'],
          validate: {
            config: { schema: schema.object({}) },
            secrets: { schema: schema.object({}) },
            params: { schema: schema.object({}) },
          },
          executor,
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Invalid feature ids \\"foo\\" for connector type \\"my-connector-type\\"."`
      );
    });

    test('registers gold+ connector types to the licensing feature usage API', () => {
      const connectorTypeRegistry = new ConnectorTypeRegistry(connectorTypeRegistryParams);
      connectorTypeRegistry.register({
        id: 'my-connector-type',
        name: 'My connector type',
        minimumLicenseRequired: 'gold',
        supportedFeatureIds: ['alerting'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        executor,
      });
      expect(connectorTypeRegistryParams.licensing.featureUsage.register).toHaveBeenCalledWith(
        'Connector: My connector type',
        'gold'
      );
    });

    test(`doesn't register basic connector types to the licensing feature usage API`, () => {
      const connectorTypeRegistry = new ConnectorTypeRegistry(connectorTypeRegistryParams);
      connectorTypeRegistry.register({
        id: 'my-connector-type',
        name: 'My connector type',
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        executor,
      });
      expect(connectorTypeRegistryParams.licensing.featureUsage.register).not.toHaveBeenCalled();
    });

    test('allows registering system connectors', () => {
      const connectorTypeRegistry = new ConnectorTypeRegistry(connectorTypeRegistryParams);

      expect(() =>
        connectorTypeRegistry.register({
          id: 'my-connector-type',
          name: 'My connector type',
          minimumLicenseRequired: 'basic',
          supportedFeatureIds: ['alerting'],
          isSystemActionType: true,
          validate: {
            config: { schema: schema.object({}) },
            secrets: { schema: schema.object({}) },
            params: { schema: schema.object({}) },
          },
          executor,
        })
      ).not.toThrow();
    });

    test('throws if the kibana privileges are defined but the connector type is not a system connector type or sub-feature type', () => {
      const connectorTypeRegistry = new ConnectorTypeRegistry(connectorTypeRegistryParams);

      expect(() =>
        connectorTypeRegistry.register({
          id: 'my-connector-type',
          name: 'My connector type',
          minimumLicenseRequired: 'basic',
          supportedFeatureIds: ['alerting'],
          getKibanaPrivileges: jest.fn(),
          isSystemActionType: false,
          validate: {
            config: { schema: schema.object({}) },
            secrets: { schema: schema.object({}) },
            params: { schema: schema.object({}) },
          },
          executor,
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Kibana privilege authorization is only supported for system actions and action types that are registered under a sub-feature"`
      );
    });
  });

  describe('get()', () => {
    test('returns connector type', () => {
      const connectorTypeRegistry = new ConnectorTypeRegistry(connectorTypeRegistryParams);
      connectorTypeRegistry.register({
        id: 'my-connector-type',
        name: 'My connector type',
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        executor,
      });
      const { validate, ...rest } = connectorTypeRegistry.get('my-connector-type');
      expect(validate).toBeDefined();
      expect(rest).toMatchInlineSnapshot(`
      Object {
        "executor": [Function],
        "id": "my-connector-type",
        "minimumLicenseRequired": "basic",
        "name": "My connector type",
        "supportedFeatureIds": Array [
          "alerting",
        ],
      }
    `);
    });

    test(`throws an error when connector type doesn't exist`, () => {
      const connectorTypeRegistry = new ConnectorTypeRegistry(connectorTypeRegistryParams);
      expect(() =>
        connectorTypeRegistry.get('my-connector-type')
      ).toThrowErrorMatchingInlineSnapshot(
        `"Action type \\"my-connector-type\\" is not registered."`
      );
    });
  });

  describe('list()', () => {
    test('returns list of connector types', () => {
      mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });
      const connectorTypeRegistry = new ConnectorTypeRegistry(connectorTypeRegistryParams);
      connectorTypeRegistry.register({
        id: 'my-connector-type',
        name: 'My connector type',
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        executor,
      });
      const connectorTypes = connectorTypeRegistry.list();
      expect(connectorTypes).toEqual([
        {
          id: 'my-connector-type',
          name: 'My connector type',
          enabled: true,
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic',
          supportedFeatureIds: ['alerting'],
          isSystemActionType: false,
        },
      ]);
      expect(mockedActionsConfig.isActionTypeEnabled).toHaveBeenCalled();
      expect(mockedLicenseState.isLicenseValidForActionType).toHaveBeenCalled();
    });

    test('returns list of connector types filtered by feature id if provided', () => {
      mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });
      const connectorTypeRegistry = new ConnectorTypeRegistry(connectorTypeRegistryParams);
      connectorTypeRegistry.register({
        id: 'my-connector-type',
        name: 'My connector type',
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        executor,
      });
      connectorTypeRegistry.register({
        id: 'another-connector-type',
        name: 'My connector type',
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['cases'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        executor,
      });
      const connectorTypes = connectorTypeRegistry.list('alerting');
      expect(connectorTypes).toEqual([
        {
          id: 'my-connector-type',
          name: 'My connector type',
          enabled: true,
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic',
          supportedFeatureIds: ['alerting'],
          isSystemActionType: false,
        },
      ]);
      expect(mockedActionsConfig.isActionTypeEnabled).toHaveBeenCalled();
      expect(mockedLicenseState.isLicenseValidForActionType).toHaveBeenCalled();
    });

    test('sets the isSystemActionType correctly for system connectors', () => {
      mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });
      const connectorTypeRegistry = new ConnectorTypeRegistry(connectorTypeRegistryParams);

      connectorTypeRegistry.register({
        id: 'test.system-connector',
        name: 'Cases',
        minimumLicenseRequired: 'platinum',
        supportedFeatureIds: ['alerting'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        isSystemActionType: true,
        executor,
      });

      const connectorTypes = connectorTypeRegistry.list();

      expect(connectorTypes).toEqual([
        {
          id: 'test.system-connector',
          name: 'Cases',
          enabled: true,
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'platinum',
          supportedFeatureIds: ['alerting'],
          isSystemActionType: true,
        },
      ]);
    });

    test('sets the subFeature correctly for sub-feature type connectors', () => {
      mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });
      const connectorTypeRegistry = new ConnectorTypeRegistry(connectorTypeRegistryParams);

      connectorTypeRegistry.register({
        id: 'test.sub-feature-connector',
        name: 'Test',
        minimumLicenseRequired: 'platinum',
        supportedFeatureIds: ['siem'],
        getKibanaPrivileges: () => ['test/create-sub-feature'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        subFeature: 'endpointSecurity',
        executor,
      });

      const connectorTypes = connectorTypeRegistry.list();

      expect(connectorTypes).toEqual([
        {
          enabled: true,
          enabledInConfig: true,
          enabledInLicense: true,
          id: 'test.sub-feature-connector',
          isSystemActionType: false,
          minimumLicenseRequired: 'platinum',
          name: 'Test',
          subFeature: 'endpointSecurity',
          supportedFeatureIds: ['siem'],
        },
      ]);
    });
  });

  describe('has()', () => {
    test('returns false for unregistered connector types', () => {
      const connectorTypeRegistry = new ConnectorTypeRegistry(connectorTypeRegistryParams);
      expect(connectorTypeRegistry.has('my-connector-type')).toEqual(false);
    });

    test('returns true after registering an connector type', () => {
      const connectorTypeRegistry = new ConnectorTypeRegistry(connectorTypeRegistryParams);
      connectorTypeRegistry.register({
        id: 'my-connector-type',
        name: 'My connector type',
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        executor,
      });
      expect(connectorTypeRegistry.has('my-action-type'));
    });
  });

  describe('isActionTypeEnabled', () => {
    let connectorTypeRegistry: ConnectorTypeRegistry;

    const fooConnectorType: ConnectorType = {
      id: 'foo',
      name: 'Foo',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      validate: {
        config: { schema: schema.object({}) },
        secrets: { schema: schema.object({}) },
        params: { schema: schema.object({}) },
      },
      executor: async (options) => {
        return { status: 'ok', actionId: options.actionId };
      },
    };

    const systemConnectorType: ConnectorType = {
      ...fooConnectorType,
      id: 'system-connector-type',
      name: 'System connector type',
      isSystemActionType: true,
    };

    beforeEach(() => {
      connectorTypeRegistry = new ConnectorTypeRegistry(connectorTypeRegistryParams);
      connectorTypeRegistry.register(fooConnectorType);
      connectorTypeRegistry.register(systemConnectorType);
    });

    test('should call isActionTypeEnabled of the actions config', async () => {
      mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });
      connectorTypeRegistry.isActionTypeEnabled('foo');
      expect(mockedActionsConfig.isActionTypeEnabled).toHaveBeenCalledWith('foo');
    });

    test('should call isActionExecutable of the actions config', async () => {
      mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });
      connectorTypeRegistry.isActionExecutable('my-slack1', 'foo');
      expect(mockedActionsConfig.isActionTypeEnabled).toHaveBeenCalledWith('foo');
    });

    test('should return true when isActionTypeEnabled is false and isLicenseValidForActionType is true and it has preconfigured connectors', async () => {
      mockedActionsConfig.isActionTypeEnabled.mockReturnValue(false);
      mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });

      expect(connectorTypeRegistry.isActionExecutable('my-slack1', 'foo')).toEqual(true);
    });

    test('should return true when isActionTypeEnabled is false and isLicenseValidForActionType is true and it has system connectors', async () => {
      mockedActionsConfig.isActionTypeEnabled.mockReturnValue(false);
      mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });

      expect(
        connectorTypeRegistry.isActionExecutable(
          'system-connector-test.system-connector',
          'system-connector-type'
        )
      ).toEqual(true);
    });

    test('should call isLicenseValidForActionType of the license state with notifyUsage false by default', async () => {
      mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });
      connectorTypeRegistry.isActionTypeEnabled('foo');
      expect(mockedLicenseState.isLicenseValidForActionType).toHaveBeenCalledWith(
        fooConnectorType,
        {
          notifyUsage: false,
        }
      );
    });

    test('should call isLicenseValidForActionType of the license state with notifyUsage true when specified', async () => {
      mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });
      connectorTypeRegistry.isActionTypeEnabled('foo', { notifyUsage: true });
      expect(mockedLicenseState.isLicenseValidForActionType).toHaveBeenCalledWith(
        fooConnectorType,
        {
          notifyUsage: true,
        }
      );
    });

    test('should return false when isActionTypeEnabled is false and isLicenseValidForActionType is true', async () => {
      mockedActionsConfig.isActionTypeEnabled.mockReturnValue(false);
      mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });
      expect(connectorTypeRegistry.isActionTypeEnabled('foo')).toEqual(false);
    });

    test('should return false when isActionTypeEnabled is true and isLicenseValidForActionType is false', async () => {
      mockedActionsConfig.isActionTypeEnabled.mockReturnValue(true);
      mockedLicenseState.isLicenseValidForActionType.mockReturnValue({
        isValid: false,
        reason: 'invalid',
      });
      expect(connectorTypeRegistry.isActionTypeEnabled('foo')).toEqual(false);
    });
  });

  describe('ensureActionTypeEnabled', () => {
    let connectorTypeRegistry: ConnectorTypeRegistry;
    const fooConnectorType: ConnectorType = {
      id: 'foo',
      name: 'Foo',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      validate: {
        config: { schema: schema.object({}) },
        secrets: { schema: schema.object({}) },
        params: { schema: schema.object({}) },
      },
      executor: async (options) => {
        return { status: 'ok', actionId: options.actionId };
      },
    };

    beforeEach(() => {
      connectorTypeRegistry = new ConnectorTypeRegistry(connectorTypeRegistryParams);
      connectorTypeRegistry.register(fooConnectorType);
    });

    test('should call ensureActionTypeEnabled of the action config', async () => {
      connectorTypeRegistry.ensureActionTypeEnabled('foo');
      expect(mockedActionsConfig.ensureActionTypeEnabled).toHaveBeenCalledWith('foo');
    });

    test('should call ensureLicenseForActionType on the license state', async () => {
      connectorTypeRegistry.ensureActionTypeEnabled('foo');
      expect(mockedLicenseState.ensureLicenseForActionType).toHaveBeenCalledWith(fooConnectorType);
    });

    test('should throw when ensureActionTypeEnabled throws', async () => {
      mockedActionsConfig.ensureActionTypeEnabled.mockImplementation(() => {
        throw new Error('Fail');
      });
      expect(() =>
        connectorTypeRegistry.ensureActionTypeEnabled('foo')
      ).toThrowErrorMatchingInlineSnapshot(`"Fail"`);
    });

    test('should throw when ensureLicenseForActionType throws', async () => {
      mockedLicenseState.ensureLicenseForActionType.mockImplementation(() => {
        throw new Error('Fail');
      });
      expect(() =>
        connectorTypeRegistry.ensureActionTypeEnabled('foo')
      ).toThrowErrorMatchingInlineSnapshot(`"Fail"`);
    });
  });

  describe('isActionExecutable()', () => {
    let connectorTypeRegistry: ConnectorTypeRegistry;
    const fooConnectorType: ConnectorType = {
      id: 'foo',
      name: 'Foo',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      validate: {
        config: { schema: schema.object({}) },
        secrets: { schema: schema.object({}) },
        params: { schema: schema.object({}) },
      },
      executor: async (options) => {
        return { status: 'ok', actionId: options.actionId };
      },
    };

    beforeEach(() => {
      connectorTypeRegistry = new ConnectorTypeRegistry(connectorTypeRegistryParams);
      connectorTypeRegistry.register(fooConnectorType);
      // @ts-expect-error accessing private property for testing
      connectorTypeRegistry.inMemoryConnectors.push({
        ...fooConnectorType,
        id: 'foo-preconfig',
        name: 'Foo-preconfig',
        actionTypeId: 'foo',
        isPreconfigured: true,
        config: {},
        secrets: {},
      });
      // @ts-expect-error accessing private property for testing
      connectorTypeRegistry.inMemoryConnectors.push({
        ...fooConnectorType,
        id: 'foo-system',
        name: 'Foo-system',
        actionTypeId: 'foo',
        isSystemAction: true,
        config: {},
        secrets: {},
      });
    });

    test('should call isLicenseValidForActionType of the license state with notifyUsage false by default', async () => {
      mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });
      connectorTypeRegistry.isActionExecutable('123', 'foo');
      expect(mockedLicenseState.isLicenseValidForActionType).toHaveBeenCalledWith(
        fooConnectorType,
        {
          notifyUsage: false,
        }
      );
    });

    test('should call isLicenseValidForActionType of the license state with notifyUsage true when specified', async () => {
      mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });
      connectorTypeRegistry.isActionExecutable('123', 'foo', { notifyUsage: true });
      expect(mockedLicenseState.isLicenseValidForActionType).toHaveBeenCalledWith(
        fooConnectorType,
        {
          notifyUsage: true,
        }
      );
    });

    test('should return true for enabled type', async () => {
      mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });
      const result = connectorTypeRegistry.isActionExecutable('123', 'foo');
      expect(result).toEqual(true);
    });

    test('should return false when license invalid', async () => {
      mockedLicenseState.isLicenseValidForActionType.mockReturnValue({
        isValid: false,
        reason: 'invalid',
      });
      const result = connectorTypeRegistry.isActionExecutable('123', 'foo');
      expect(result).toEqual(false);
    });

    test('should return true for disabled type, but preconfigured connector', async () => {
      mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });
      mockedActionsConfig.isActionTypeEnabled.mockReturnValue(false);
      const result = connectorTypeRegistry.isActionExecutable('foo-preconfig', 'foo');
      expect(result).toEqual(true);
    });

    test('should return true for disabled type, but system connector', async () => {
      mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });
      mockedActionsConfig.isActionTypeEnabled.mockReturnValue(false);
      const result = connectorTypeRegistry.isActionExecutable('foo-system', 'foo');
      expect(result).toEqual(true);
    });
  });

  describe('getAllTypes()', () => {
    test('should return empty when notihing is registered', () => {
      const registry = new ConnectorTypeRegistry(connectorTypeRegistryParams);
      const result = registry.getAllTypes();
      expect(result).toEqual([]);
    });

    test('should return list of registered type ids', () => {
      mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });
      const registry = new ConnectorTypeRegistry(connectorTypeRegistryParams);
      registry.register({
        id: 'foo',
        name: 'Foo',
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        executor: async (options) => {
          return { status: 'ok', actionId: options.actionId };
        },
      });
      const result = registry.getAllTypes();
      expect(result).toEqual(['foo']);
    });
  });

  describe('isSystemActionType()', () => {
    it('should return true if the connector type is a system connector type', () => {
      const registry = new ConnectorTypeRegistry(connectorTypeRegistryParams);

      registry.register({
        id: 'test.system-connector',
        name: 'Cases',
        minimumLicenseRequired: 'platinum',
        supportedFeatureIds: ['alerting'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        isSystemActionType: true,
        executor,
      });

      const result = registry.isSystemActionType('test.system-connector');
      expect(result).toBe(true);
    });

    it('should return false if the connector type is not a system connector type', () => {
      mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });

      const registry = new ConnectorTypeRegistry(connectorTypeRegistryParams);

      registry.register({
        id: 'foo',
        name: 'Foo',
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        executor,
      });

      const allTypes = registry.getAllTypes();
      expect(allTypes.length).toBe(1);

      const result = registry.isSystemActionType('foo');
      expect(result).toBe(false);
    });

    it('should return false if the connector type does not exists', () => {
      const registry = new ConnectorTypeRegistry(connectorTypeRegistryParams);

      const allTypes = registry.getAllTypes();
      expect(allTypes.length).toBe(0);

      const result = registry.isSystemActionType('not-exist');
      expect(result).toBe(false);
    });
  });

  describe('hasSubFeature()', () => {
    it('should return true if the connector type has a sub-feature type', () => {
      const registry = new ConnectorTypeRegistry(connectorTypeRegistryParams);

      registry.register({
        id: 'test.sub-feature-connector',
        name: 'Test',
        minimumLicenseRequired: 'platinum',
        supportedFeatureIds: ['siem'],
        getKibanaPrivileges: () => ['test/create-sub-feature'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        subFeature: 'endpointSecurity',
        executor,
      });

      const result = registry.hasSubFeature('test.sub-feature-connector');
      expect(result).toBe(true);
    });

    it('should return false if the connector type does not have a sub-feature type', () => {
      mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });

      const registry = new ConnectorTypeRegistry(connectorTypeRegistryParams);

      registry.register({
        id: 'foo',
        name: 'Foo',
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        executor,
      });

      const allTypes = registry.getAllTypes();
      expect(allTypes.length).toBe(1);

      const result = registry.hasSubFeature('foo');
      expect(result).toBe(false);
    });

    it('should return false if the connector type does not exists', () => {
      const registry = new ConnectorTypeRegistry(connectorTypeRegistryParams);

      const allTypes = registry.getAllTypes();
      expect(allTypes.length).toBe(0);

      const result = registry.hasSubFeature('not-exist');
      expect(result).toBe(false);
    });
  });

  describe('getActionKibanaPrivileges()', () => {
    it('should get the kibana privileges correctly', () => {
      const registry = new ConnectorTypeRegistry(connectorTypeRegistryParams);

      registry.register({
        id: 'test.system-connector',
        name: 'Cases',
        minimumLicenseRequired: 'platinum',
        supportedFeatureIds: ['alerting'],
        getKibanaPrivileges: () => ['test/create'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        isSystemActionType: true,
        executor,
      });
      registry.register({
        id: 'test.sub-feature-connector',
        name: 'Test',
        minimumLicenseRequired: 'platinum',
        supportedFeatureIds: ['siem'],
        getKibanaPrivileges: () => ['test/create-sub-feature'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        subFeature: 'endpointSecurity',
        executor,
      });

      let result = registry.getActionKibanaPrivileges('test.system-connector');
      expect(result).toEqual(['test/create']);
      result = registry.getActionKibanaPrivileges('test.sub-feature-connector');
      expect(result).toEqual(['test/create-sub-feature']);
    });

    it('should return an empty array if the connector type does not define any kibana privileges', () => {
      const registry = new ConnectorTypeRegistry(connectorTypeRegistryParams);

      registry.register({
        id: 'test.system-connector',
        name: 'Cases',
        minimumLicenseRequired: 'platinum',
        supportedFeatureIds: ['alerting'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        isSystemActionType: true,
        executor,
      });
      registry.register({
        id: 'test.sub-feature-connector',
        name: 'Test',
        minimumLicenseRequired: 'platinum',
        supportedFeatureIds: ['siem'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        subFeature: 'endpointSecurity',
        executor,
      });

      let result = registry.getActionKibanaPrivileges('test.system-connector');
      expect(result).toEqual([]);
      result = registry.getActionKibanaPrivileges('test.sub-feature-connector');
      expect(result).toEqual([]);
    });

    it('should return an empty array if the connector type is not a system connector or a sub-feature type connector', () => {
      const registry = new ConnectorTypeRegistry(connectorTypeRegistryParams);

      registry.register({
        id: 'foo',
        name: 'Foo',
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        executor,
      });

      const result = registry.getActionKibanaPrivileges('foo');
      expect(result).toEqual([]);
    });

    it('should pass the params and source correctly', () => {
      const registry = new ConnectorTypeRegistry(connectorTypeRegistryParams);
      const getKibanaPrivileges = jest.fn().mockReturnValue(['test/create']);

      registry.register({
        id: 'test.system-connector',
        name: 'Cases',
        minimumLicenseRequired: 'platinum',
        supportedFeatureIds: ['alerting'],
        getKibanaPrivileges,
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        isSystemActionType: true,
        executor,
      });

      registry.getActionKibanaPrivileges(
        'test.system-connector',
        { foo: 'bar' },
        ActionExecutionSourceType.HTTP_REQUEST
      );
      expect(getKibanaPrivileges).toHaveBeenCalledWith({
        params: { foo: 'bar' },
        source: ActionExecutionSourceType.HTTP_REQUEST,
      });
    });
  });
});
