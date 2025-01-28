/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import moment from 'moment';
import { schema, ByteSizeValue } from '@kbn/config-schema';
import { PluginInitializerContext, RequestHandlerContext } from '@kbn/core/server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { eventLogMock } from '@kbn/event-log-plugin/server/mocks';
import { serverlessPluginMock } from '@kbn/serverless/server/mocks';
import { ActionType, ActionsApiRequestHandlerContext, ExecutorType } from './types';
import { ActionsConfig } from './config';
import {
  ActionsPlugin,
  ActionsPluginsSetup,
  ActionsPluginsStart,
  PluginSetupContract,
} from './plugin';
import {
  AlertHistoryEsIndexConnectorId,
  DEFAULT_MICROSOFT_EXCHANGE_URL,
  DEFAULT_MICROSOFT_GRAPH_API_SCOPE,
  DEFAULT_MICROSOFT_GRAPH_API_URL,
} from '../common';
import { cloudMock } from '@kbn/cloud-plugin/server/mocks';

const executor: ExecutorType<{}, {}, {}, void> = async (options) => {
  return { status: 'ok', actionId: options.actionId };
};

function getConfig(overrides = {}) {
  return {
    enabled: true,
    enabledActionTypes: ['*'],
    allowedHosts: ['*'],
    preconfiguredAlertHistoryEsIndex: false,
    preconfigured: {
      preconfiguredServerLog: {
        actionTypeId: '.server-log',
        name: 'preconfigured-server-log',
        config: {},
        secrets: {},
      },
    },
    proxyBypassHosts: undefined,
    proxyOnlyHosts: undefined,
    maxResponseContentLength: new ByteSizeValue(1000000),
    responseTimeout: moment.duration('60s'),
    enableFooterInEmail: true,
    microsoftGraphApiUrl: DEFAULT_MICROSOFT_GRAPH_API_URL,
    microsoftGraphApiScope: DEFAULT_MICROSOFT_GRAPH_API_SCOPE,
    microsoftExchangeUrl: DEFAULT_MICROSOFT_EXCHANGE_URL,
    usage: {
      url: 'ca.path',
    },
    ...overrides,
  };
}

describe('Actions Plugin', () => {
  describe('setup()', () => {
    let context: PluginInitializerContext;
    let plugin: ActionsPlugin;
    let coreSetup: ReturnType<typeof coreMock.createSetup>;
    let pluginsSetup: jest.Mocked<ActionsPluginsSetup>;

    beforeEach(() => {
      context = coreMock.createPluginInitializerContext<ActionsConfig>({
        enabledActionTypes: ['*'],
        allowedHosts: ['*'],
        preconfiguredAlertHistoryEsIndex: false,
        preconfigured: {},
        maxResponseContentLength: new ByteSizeValue(1000000),
        responseTimeout: moment.duration(60000),
        enableFooterInEmail: true,
        microsoftGraphApiUrl: DEFAULT_MICROSOFT_GRAPH_API_URL,
        microsoftGraphApiScope: DEFAULT_MICROSOFT_GRAPH_API_SCOPE,
        microsoftExchangeUrl: DEFAULT_MICROSOFT_EXCHANGE_URL,
        usage: {
          url: 'ca.path',
        },
      });
      plugin = new ActionsPlugin(context);
      coreSetup = coreMock.createSetup();

      pluginsSetup = {
        taskManager: taskManagerMock.createSetup(),
        encryptedSavedObjects: encryptedSavedObjectsMock.createSetup(),
        licensing: licensingMock.createSetup(),
        eventLog: eventLogMock.createSetup(),
        usageCollection: usageCollectionPluginMock.createSetupContract(),
        features: featuresPluginMock.createSetup(),
        cloud: cloudMock.createSetup(),
      };
      coreSetup.getStartServices.mockResolvedValue([
        coreMock.createStart(),
        {
          ...pluginsSetup,
          encryptedSavedObjects: encryptedSavedObjectsMock.createStart(),
        },
        {},
      ]);
    });

    it('should log warning when Encrypted Saved Objects plugin is missing encryption key', async () => {
      await plugin.setup(coreSetup, pluginsSetup);
      expect(pluginsSetup.encryptedSavedObjects.canEncrypt).toEqual(false);
      expect(context.logger.get().warn).toHaveBeenCalledWith(
        'APIs are disabled because the Encrypted Saved Objects plugin is missing encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.'
      );
    });

    describe('routeHandlerContext.getActionsClient()', () => {
      it('should not throw error when ESO plugin has encryption key', async () => {
        await plugin.setup(coreSetup, {
          ...pluginsSetup,
          encryptedSavedObjects: {
            ...pluginsSetup.encryptedSavedObjects,
            canEncrypt: true,
          },
        });

        expect(coreSetup.http.registerRouteHandlerContext).toHaveBeenCalledTimes(1);
        const handler = coreSetup.http.registerRouteHandlerContext.mock.calls[0] as [
          string,
          Function
        ];
        expect(handler[0]).toEqual('actions');

        const actionsContextHandler = (await handler[1](
          {
            core: {
              savedObjects: {
                client: {},
              },
              elasticsearch: {
                client: jest.fn(),
              },
            },
          } as unknown as RequestHandlerContext,
          httpServerMock.createKibanaRequest(),
          httpServerMock.createResponseFactory()
        )) as unknown as ActionsApiRequestHandlerContext;
        expect(actionsContextHandler!.getActionsClient()).toBeDefined();
      });

      it('should throw error when ESO plugin is missing encryption key', async () => {
        await plugin.setup(coreSetup, pluginsSetup);

        expect(coreSetup.http.registerRouteHandlerContext).toHaveBeenCalledTimes(1);
        const handler = coreSetup.http.registerRouteHandlerContext.mock.calls[0] as [
          string,
          Function
        ];
        expect(handler[0]).toEqual('actions');

        const actionsContextHandler = (await handler[1](
          {
            core: {
              savedObjects: {
                client: {},
              },
            },
          } as unknown as RequestHandlerContext,
          httpServerMock.createKibanaRequest(),
          httpServerMock.createResponseFactory()
        )) as unknown as ActionsApiRequestHandlerContext;
        expect(() => actionsContextHandler!.getActionsClient()).toThrowErrorMatchingInlineSnapshot(
          `"Unable to create actions client because the Encrypted Saved Objects plugin is missing encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command."`
        );
      });

      it('the actions client should have the correct in-memory connectors', async () => {
        context = coreMock.createPluginInitializerContext<ActionsConfig>(getConfig());
        const pluginWithPreconfiguredConnectors = new ActionsPlugin(context);

        const coreStart = coreMock.createStart();
        const pluginsStart = {
          licensing: licensingMock.createStart(),
          taskManager: taskManagerMock.createStart(),
          encryptedSavedObjects: encryptedSavedObjectsMock.createStart(),
          eventLog: eventLogMock.createStart(),
        };

        /**
         * 1. In the setup of the actions plugin
         * the preconfigured connectors are being
         * set up. Also, the action router handler context
         * is registered
         */
        const pluginSetup = await pluginWithPreconfiguredConnectors.setup(coreSetup, {
          ...pluginsSetup,
          encryptedSavedObjects: {
            ...pluginsSetup.encryptedSavedObjects,
            canEncrypt: true,
          },
        });

        /**
         * 2. We simulate the registration of
         * a system action by another plugin
         * in the setup
         */
        pluginSetup.registerType({
          id: '.cases',
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

        const handler = coreSetup.http.registerRouteHandlerContext.mock.calls[0];

        /**
         * 3. On start the system actions are being
         * created based on the system action types
         * that got registered on step 2
         */
        await pluginWithPreconfiguredConnectors.start(coreStart, pluginsStart);

        const actionsContextHandler = (await handler[1](
          {
            core: {
              savedObjects: {
                client: {},
              },
              elasticsearch: {
                client: jest.fn(),
              },
            },
          } as unknown as RequestHandlerContext,
          httpServerMock.createKibanaRequest(),
          httpServerMock.createResponseFactory()
        )) as unknown as ActionsApiRequestHandlerContext;

        /**
         * 4. We verify that the actions client inside
         * the router context has the correct system connectors
         * that got set up on start (step 3).
         */
        // @ts-expect-error: inMemoryConnectors can be accessed
        expect(actionsContextHandler.getActionsClient().context.inMemoryConnectors).toEqual([
          {
            id: 'preconfiguredServerLog',
            actionTypeId: '.server-log',
            name: 'preconfigured-server-log',
            config: {},
            secrets: {},
            isDeprecated: false,
            isPreconfigured: true,
            isSystemAction: false,
          },
          {
            id: 'system-connector-.cases',
            actionTypeId: '.cases',
            name: 'Cases',
            config: {},
            secrets: {},
            isDeprecated: false,
            isPreconfigured: false,
            isSystemAction: true,
            isMissingSecrets: false,
          },
        ]);
      });
    });

    describe('registerType()', () => {
      let setup: PluginSetupContract;
      const sampleActionType: ActionType = {
        id: 'test',
        name: 'test',
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        async executor(options) {
          return { status: 'ok', actionId: options.actionId };
        },
      };

      beforeEach(async () => {
        // coreMock.createSetup doesn't support Plugin generics

        setup = await plugin.setup(coreSetup as any, pluginsSetup);
      });

      it('should throw error when license type is invalid', async () => {
        expect(() =>
          setup.registerType({
            ...sampleActionType,
            // we're faking an invalid value, this requires stripping the typing

            minimumLicenseRequired: 'foo' as any,
          })
        ).toThrowErrorMatchingInlineSnapshot(`"\\"foo\\" is not a valid license type"`);
      });

      it('should throw error when license type is less than gold', async () => {
        expect(() =>
          setup.registerType({
            ...sampleActionType,
            minimumLicenseRequired: 'basic',
          })
        ).toThrowErrorMatchingInlineSnapshot(
          `"Third party action type \\"test\\" can only set minimumLicenseRequired to a gold license or higher"`
        );
      });

      it('should not throw when license type is gold', async () => {
        setup.registerType({
          ...sampleActionType,
          minimumLicenseRequired: 'gold',
        });
      });

      it('should not throw when license type is higher than gold', async () => {
        setup.registerType({
          ...sampleActionType,
          minimumLicenseRequired: 'platinum',
        });
      });
    });

    describe('isPreconfiguredConnector', () => {
      function setup(config: ActionsConfig) {
        context = coreMock.createPluginInitializerContext<ActionsConfig>(config);
        plugin = new ActionsPlugin(context);
        coreSetup = coreMock.createSetup();
        pluginsSetup = {
          taskManager: taskManagerMock.createSetup(),
          encryptedSavedObjects: encryptedSavedObjectsMock.createSetup(),
          licensing: licensingMock.createSetup(),
          eventLog: eventLogMock.createSetup(),
          usageCollection: usageCollectionPluginMock.createSetupContract(),
          features: featuresPluginMock.createSetup(),
          cloud: cloudMock.createSetup(),
        };
      }

      it('should correctly return whether connector is preconfigured', async () => {
        setup(getConfig());
        // coreMock.createSetup doesn't support Plugin generics

        const pluginSetup = await plugin.setup(coreSetup as any, pluginsSetup);

        expect(pluginSetup.isPreconfiguredConnector('preconfiguredServerLog')).toEqual(true);
        expect(pluginSetup.isPreconfiguredConnector('anotherConnectorId')).toEqual(false);
      });
    });

    describe('setEnabledConnectorTypes (works only on serverless)', () => {
      function setup(config: ActionsConfig) {
        context = coreMock.createPluginInitializerContext<ActionsConfig>(config);
        plugin = new ActionsPlugin(context);
        coreSetup = coreMock.createSetup();
        pluginsSetup = {
          taskManager: taskManagerMock.createSetup(),
          encryptedSavedObjects: encryptedSavedObjectsMock.createSetup(),
          licensing: licensingMock.createSetup(),
          eventLog: eventLogMock.createSetup(),
          usageCollection: usageCollectionPluginMock.createSetupContract(),
          features: featuresPluginMock.createSetup(),
          serverless: serverlessPluginMock.createSetupContract(),
          cloud: cloudMock.createSetup(),
        };
      }

      it('should set connector type enabled', async () => {
        setup(getConfig());
        // coreMock.createSetup doesn't support Plugin generics

        const pluginSetup = await plugin.setup(coreSetup as any, pluginsSetup);
        const coreStart = coreMock.createStart();
        const pluginsStart = {
          licensing: licensingMock.createStart(),
          taskManager: taskManagerMock.createStart(),
          encryptedSavedObjects: encryptedSavedObjectsMock.createStart(),
          eventLog: eventLogMock.createStart(),
        };
        const pluginStart = plugin.start(coreStart, pluginsStart);

        pluginSetup.registerType({
          id: '.server-log',
          name: 'Server log',
          minimumLicenseRequired: 'basic',
          supportedFeatureIds: ['alerting'],
          validate: {
            config: { schema: schema.object({}) },
            secrets: { schema: schema.object({}) },
            params: { schema: schema.object({}) },
          },
          executor,
        });
        pluginSetup.registerType({
          id: '.slack',
          name: 'Slack',
          minimumLicenseRequired: 'gold',
          supportedFeatureIds: ['alerting'],
          validate: {
            config: { schema: schema.object({}) },
            secrets: { schema: schema.object({}) },
            params: { schema: schema.object({}) },
          },
          executor,
        });
        pluginSetup.setEnabledConnectorTypes(['.server-log']);
        expect(pluginStart.isActionTypeEnabled('.server-log')).toBeTruthy();
        expect(pluginStart.isActionTypeEnabled('.slack')).toBeFalsy();
      });

      it('should set connector type enabled and check isActionTypeEnabled with plugin setup method', async () => {
        setup(getConfig());
        // coreMock.createSetup doesn't support Plugin generics

        const pluginSetup = await plugin.setup(coreSetup as any, pluginsSetup);

        pluginSetup.registerType({
          id: '.server-log',
          name: 'Server log',
          minimumLicenseRequired: 'basic',
          supportedFeatureIds: ['alerting'],
          validate: {
            config: { schema: schema.object({}) },
            secrets: { schema: schema.object({}) },
            params: { schema: schema.object({}) },
          },
          executor,
        });
        pluginSetup.registerType({
          id: '.slack',
          name: 'Slack',
          minimumLicenseRequired: 'gold',
          supportedFeatureIds: ['alerting'],
          validate: {
            config: { schema: schema.object({}) },
            secrets: { schema: schema.object({}) },
            params: { schema: schema.object({}) },
          },
          executor,
        });
        pluginSetup.setEnabledConnectorTypes(['.server-log']);

        // checking isActionTypeEnabled via plugin setup, not plugin start
        expect(pluginSetup.isActionTypeEnabled('.server-log')).toBeTruthy();
        expect(pluginSetup.isActionTypeEnabled('.slack')).toBeFalsy();
      });

      it('should set all the connector types enabled when null or ["*"] passed', async () => {
        setup(getConfig());
        // coreMock.createSetup doesn't support Plugin generics

        const pluginSetup = await plugin.setup(coreSetup as any, pluginsSetup);
        const coreStart = coreMock.createStart();
        const pluginsStart = {
          licensing: licensingMock.createStart(),
          taskManager: taskManagerMock.createStart(),
          encryptedSavedObjects: encryptedSavedObjectsMock.createStart(),
          eventLog: eventLogMock.createStart(),
        };
        const pluginStart = plugin.start(coreStart, pluginsStart);

        pluginSetup.registerType({
          id: '.server-log',
          name: 'Server log',
          minimumLicenseRequired: 'basic',
          supportedFeatureIds: ['alerting'],
          validate: {
            config: { schema: schema.object({}) },
            secrets: { schema: schema.object({}) },
            params: { schema: schema.object({}) },
          },
          executor,
        });
        pluginSetup.registerType({
          id: '.index',
          name: 'Index',
          minimumLicenseRequired: 'basic',
          supportedFeatureIds: ['alerting'],
          validate: {
            config: { schema: schema.object({}) },
            secrets: { schema: schema.object({}) },
            params: { schema: schema.object({}) },
          },
          executor,
        });
        pluginSetup.setEnabledConnectorTypes(['*']);
        expect(pluginStart.isActionTypeEnabled('.server-log')).toBeTruthy();
        expect(pluginStart.isActionTypeEnabled('.index')).toBeTruthy();
      });

      it('should set all the connector types disabled when [] passed', async () => {
        setup(getConfig());
        // coreMock.createSetup doesn't support Plugin generics

        const pluginSetup = await plugin.setup(coreSetup as any, pluginsSetup);
        const coreStart = coreMock.createStart();
        const pluginsStart = {
          licensing: licensingMock.createStart(),
          taskManager: taskManagerMock.createStart(),
          encryptedSavedObjects: encryptedSavedObjectsMock.createStart(),
          eventLog: eventLogMock.createStart(),
        };
        const pluginStart = plugin.start(coreStart, pluginsStart);

        pluginSetup.registerType({
          id: '.server-log',
          name: 'Server log',
          minimumLicenseRequired: 'basic',
          supportedFeatureIds: ['alerting'],
          validate: {
            config: { schema: schema.object({}) },
            secrets: { schema: schema.object({}) },
            params: { schema: schema.object({}) },
          },
          executor,
        });
        pluginSetup.registerType({
          id: '.index',
          name: 'Index',
          minimumLicenseRequired: 'basic',
          supportedFeatureIds: ['alerting'],
          validate: {
            config: { schema: schema.object({}) },
            secrets: { schema: schema.object({}) },
            params: { schema: schema.object({}) },
          },
          executor,
        });
        pluginSetup.setEnabledConnectorTypes([]);
        expect(pluginStart.isActionTypeEnabled('.server-log')).toBeFalsy();
        expect(pluginStart.isActionTypeEnabled('.index')).toBeFalsy();
      });

      it('should throw if the enabledActionTypes is already set by the config', async () => {
        setup({ ...getConfig(), enabledActionTypes: ['.email'] });
        // coreMock.createSetup doesn't support Plugin generics

        const pluginSetup = await plugin.setup(coreSetup as any, pluginsSetup);

        expect(() => pluginSetup.setEnabledConnectorTypes(['.index'])).toThrow(
          "Enabled connector types can be set only if they haven't already been set in the config"
        );
      });
    });
  });

  describe('start()', () => {
    let context: PluginInitializerContext;
    let plugin: ActionsPlugin;
    let coreSetup: ReturnType<typeof coreMock.createSetup>;
    let coreStart: ReturnType<typeof coreMock.createStart>;
    let pluginsSetup: jest.Mocked<ActionsPluginsSetup>;
    let pluginsStart: jest.Mocked<ActionsPluginsStart>;

    beforeEach(() => {
      context = coreMock.createPluginInitializerContext<ActionsConfig>({
        enabledActionTypes: ['*'],
        allowedHosts: ['*'],
        preconfiguredAlertHistoryEsIndex: false,
        preconfigured: {
          preconfiguredServerLog: {
            actionTypeId: '.server-log',
            name: 'preconfigured-server-log',
            config: {},
            secrets: {},
          },
        },
        maxResponseContentLength: new ByteSizeValue(1000000),
        responseTimeout: moment.duration(60000),
        enableFooterInEmail: true,
        microsoftGraphApiUrl: DEFAULT_MICROSOFT_GRAPH_API_URL,
        microsoftGraphApiScope: DEFAULT_MICROSOFT_GRAPH_API_SCOPE,
        microsoftExchangeUrl: DEFAULT_MICROSOFT_EXCHANGE_URL,
        usage: {
          url: 'ca.path',
        },
      });
      plugin = new ActionsPlugin(context);
      coreSetup = coreMock.createSetup();
      coreStart = coreMock.createStart();
      pluginsSetup = {
        taskManager: taskManagerMock.createSetup(),
        encryptedSavedObjects: encryptedSavedObjectsMock.createSetup(),
        licensing: licensingMock.createSetup(),
        eventLog: eventLogMock.createSetup(),
        usageCollection: usageCollectionPluginMock.createSetupContract(),
        features: featuresPluginMock.createSetup(),
        cloud: cloudMock.createSetup(),
      };
      pluginsStart = {
        licensing: licensingMock.createStart(),
        taskManager: taskManagerMock.createStart(),
        encryptedSavedObjects: encryptedSavedObjectsMock.createStart(),
        eventLog: eventLogMock.createStart(),
      };
    });

    it('should throw when there is an invalid connector type in enabledActionTypes', async () => {
      const pluginSetup = await plugin.setup(coreSetup, {
        ...pluginsSetup,
        encryptedSavedObjects: {
          ...pluginsSetup.encryptedSavedObjects,
          canEncrypt: true,
        },
        serverless: serverlessPluginMock.createSetupContract(),
      });

      pluginSetup.registerType({
        id: '.server-log',
        name: 'Server log',
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        executor,
      });

      pluginSetup.setEnabledConnectorTypes(['.server-log', 'non-existing']);

      await expect(async () =>
        plugin.start(coreStart, {
          ...pluginsStart,
          serverless: serverlessPluginMock.createStartContract(),
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Action type \\"non-existing\\" is not registered."`
      );
    });

    describe('getActionsClientWithRequest()', () => {
      it('should not throw error when ESO plugin has encryption key', async () => {
        await plugin.setup(coreSetup, {
          ...pluginsSetup,
          encryptedSavedObjects: {
            ...pluginsSetup.encryptedSavedObjects,
            canEncrypt: true,
          },
        });
        const pluginStart = await plugin.start(coreStart, pluginsStart);

        await pluginStart.getActionsClientWithRequest(httpServerMock.createKibanaRequest());
      });

      it('should throw error when ESO plugin is missing encryption key', async () => {
        await plugin.setup(coreSetup, pluginsSetup);
        const pluginStart = await plugin.start(coreStart, pluginsStart);

        expect(pluginsSetup.encryptedSavedObjects.canEncrypt).toEqual(false);
        await expect(
          pluginStart.getActionsClientWithRequest(httpServerMock.createKibanaRequest())
        ).rejects.toThrowErrorMatchingInlineSnapshot(
          `"Unable to create actions client because the Encrypted Saved Objects plugin is missing encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command."`
        );
      });
    });

    describe('inMemoryConnectors', () => {
      function setup(config: ActionsConfig) {
        context = coreMock.createPluginInitializerContext<ActionsConfig>(config);
        plugin = new ActionsPlugin(context);
        coreSetup = coreMock.createSetup();
        coreStart = coreMock.createStart();
        pluginsSetup = {
          taskManager: taskManagerMock.createSetup(),
          encryptedSavedObjects: encryptedSavedObjectsMock.createSetup(),
          licensing: licensingMock.createSetup(),
          eventLog: eventLogMock.createSetup(),
          usageCollection: usageCollectionPluginMock.createSetupContract(),
          features: featuresPluginMock.createSetup(),
          cloud: cloudMock.createSetup(),
        };
        pluginsStart = {
          licensing: licensingMock.createStart(),
          taskManager: taskManagerMock.createStart(),
          encryptedSavedObjects: encryptedSavedObjectsMock.createStart(),
          eventLog: eventLogMock.createStart(),
        };
      }

      describe('Preconfigured connectors', () => {
        it('should handle preconfigured actions', async () => {
          setup(getConfig());
          // coreMock.createSetup doesn't support Plugin generics

          const pluginSetup = await plugin.setup(coreSetup as any, pluginsSetup);
          pluginSetup.registerType({
            id: '.server-log',
            name: 'Server log',
            minimumLicenseRequired: 'basic',
            supportedFeatureIds: ['alerting'],
            validate: {
              config: { schema: schema.object({}) },
              secrets: { schema: schema.object({}) },
              params: { schema: schema.object({}) },
            },
            executor,
          });

          const pluginStart = await plugin.start(coreStart, pluginsStart);

          expect(pluginStart.inMemoryConnectors.length).toEqual(1);
          expect(pluginStart.isActionExecutable('preconfiguredServerLog', '.server-log')).toBe(
            true
          );
        });

        it('should handle preconfiguredAlertHistoryEsIndex = true', async () => {
          setup(getConfig({ preconfiguredAlertHistoryEsIndex: true }));

          const pluginSetup = await plugin.setup(coreSetup as any, pluginsSetup);
          pluginSetup.registerType({
            id: '.index',
            name: 'ES Index',
            minimumLicenseRequired: 'basic',
            supportedFeatureIds: ['alerting'],
            validate: {
              config: { schema: schema.object({}) },
              secrets: { schema: schema.object({}) },
              params: { schema: schema.object({}) },
            },
            executor,
          });

          const pluginStart = await plugin.start(coreStart, pluginsStart);

          expect(pluginStart.inMemoryConnectors.length).toEqual(2);
          expect(
            pluginStart.isActionExecutable('preconfigured-alert-history-es-index', '.index')
          ).toBe(true);
        });

        it('should not allow preconfigured connector with same ID as AlertHistoryEsIndexConnectorId', async () => {
          setup(
            getConfig({
              preconfigured: {
                [AlertHistoryEsIndexConnectorId]: {
                  actionTypeId: '.index',
                  name: 'clashing preconfigured index connector',
                  config: {},
                  secrets: {},
                },
              },
            })
          );
          // coreMock.createSetup doesn't support Plugin generics

          await plugin.setup(coreSetup as any, pluginsSetup);
          const pluginStart = await plugin.start(coreStart, pluginsStart);

          expect(pluginStart.inMemoryConnectors.length).toEqual(0);
          expect(context.logger.get().warn).toHaveBeenCalledWith(
            `Preconfigured connectors cannot have the id "${AlertHistoryEsIndexConnectorId}" because this is a reserved id.`
          );
        });
      });

      describe('System actions', () => {
        it('should set system actions correctly', async () => {
          setup(getConfig());
          // coreMock.createSetup doesn't support Plugin generics

          const pluginSetup = await plugin.setup(coreSetup as any, pluginsSetup);

          const platinumLicense = licensingMock.createLicense({
            license: { status: 'active', type: 'platinum' },
          });
          // @ts-ignore
          plugin.licenseState.updateInformation(platinumLicense);

          pluginSetup.registerType({
            id: '.cases',
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

          const pluginStart = await plugin.start(coreStart, pluginsStart);

          // inMemoryConnectors holds both preconfigure and system connectors
          expect(pluginStart.inMemoryConnectors.length).toEqual(2);
          expect(pluginStart.inMemoryConnectors).toEqual([
            {
              id: 'preconfiguredServerLog',
              actionTypeId: '.server-log',
              name: 'preconfigured-server-log',
              config: {},
              secrets: {},
              isDeprecated: false,
              isPreconfigured: true,
              isSystemAction: false,
            },
            {
              id: 'system-connector-.cases',
              actionTypeId: '.cases',
              name: 'Cases',
              config: {},
              secrets: {},
              isDeprecated: false,
              isMissingSecrets: false,
              isPreconfigured: false,
              isSystemAction: true,
            },
          ]);
          expect(pluginStart.isActionExecutable('preconfiguredServerLog', '.cases')).toBe(true);
        });

        it('should throw if a system action type is set in preconfigured connectors', async () => {
          setup(
            getConfig({
              preconfigured: {
                preconfiguredServerLog: {
                  actionTypeId: 'test.system-action',
                  name: 'preconfigured-system-action',
                  config: {},
                  secrets: {},
                },
              },
            })
          );

          // coreMock.createSetup doesn't support Plugin generics

          const pluginSetup = await plugin.setup(coreSetup as any, pluginsSetup);

          pluginSetup.registerType({
            id: 'test.system-action',
            name: 'Test',
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

          await expect(async () =>
            plugin.start(coreStart, pluginsStart)
          ).rejects.toThrowErrorMatchingInlineSnapshot(
            `"Setting system action types in preconfigured connectors are not allowed"`
          );
        });
      });
    });

    describe('isActionTypeEnabled()', () => {
      const actionType: ActionType = {
        id: 'my-action-type',
        name: 'My action type',
        minimumLicenseRequired: 'gold',
        supportedFeatureIds: ['alerting'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        executor: jest.fn(),
      };

      it('passes through the notifyUsage option when set to true', async () => {
        // coreMock.createSetup doesn't support Plugin generics

        const pluginSetup = await plugin.setup(coreSetup as any, pluginsSetup);
        pluginSetup.registerType(actionType);
        const pluginStart = plugin.start(coreStart, pluginsStart);

        pluginStart.isActionTypeEnabled('my-action-type', { notifyUsage: true });
        expect(pluginsStart.licensing.featureUsage.notifyUsage).toHaveBeenCalledWith(
          'Connector: My action type'
        );
      });
    });

    describe('isActionExecutable()', () => {
      const actionType: ActionType = {
        id: 'my-action-type',
        name: 'My action type',
        minimumLicenseRequired: 'gold',
        supportedFeatureIds: ['alerting'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        executor: jest.fn(),
      };

      it('passes through the notifyUsage option when set to true', async () => {
        // coreMock.createSetup doesn't support Plugin generics

        const pluginSetup = await plugin.setup(coreSetup as any, pluginsSetup);
        pluginSetup.registerType(actionType);
        const pluginStart = plugin.start(coreStart, pluginsStart);

        pluginStart.isActionExecutable('123', 'my-action-type', { notifyUsage: true });
        expect(pluginsStart.licensing.featureUsage.notifyUsage).toHaveBeenCalledWith(
          'Connector: My action type'
        );
      });
    });

    describe('getActionsHealth()', () => {
      it('should return hasPermanentEncryptionKey false if canEncrypt of encryptedSavedObjects is false', async () => {
        // coreMock.createSetup doesn't support Plugin generics

        const pluginSetup = await plugin.setup(coreSetup as any, pluginsSetup);
        expect(pluginSetup.getActionsHealth()).toEqual({ hasPermanentEncryptionKey: false });
      });
      it('should return hasPermanentEncryptionKey true if canEncrypt of encryptedSavedObjects is true', async () => {
        const pluginSetup = await plugin.setup(coreSetup, {
          ...pluginsSetup,
          encryptedSavedObjects: {
            ...pluginsSetup.encryptedSavedObjects,
            canEncrypt: true,
          },
        });
        expect(pluginSetup.getActionsHealth()).toEqual({ hasPermanentEncryptionKey: true });
      });
    });

    describe('isSystemActionConnector()', () => {
      it('should return true if the connector is a system connector', async () => {
        // coreMock.createSetup doesn't support Plugin generics

        const pluginSetup = await plugin.setup(coreSetup as any, pluginsSetup);

        pluginSetup.registerType({
          id: '.cases',
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

        const pluginStart = await plugin.start(coreStart, pluginsStart);
        expect(pluginStart.isSystemActionConnector('system-connector-.cases')).toBe(true);
      });

      it('should return false if the connector is not a system connector', async () => {
        // coreMock.createSetup doesn't support Plugin generics

        const pluginSetup = await plugin.setup(coreSetup as any, pluginsSetup);

        pluginSetup.registerType({
          id: '.cases',
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

        const pluginStart = await plugin.start(coreStart, pluginsStart);
        expect(pluginStart.isSystemActionConnector('preconfiguredServerLog')).toBe(false);
      });
    });
  });
});
