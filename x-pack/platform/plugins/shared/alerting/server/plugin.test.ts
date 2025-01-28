/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertingPlugin, AlertingServerSetup } from './plugin';
import { createUsageCollectionSetupMock } from '@kbn/usage-collection-plugin/server/mocks';
import { coreMock, statusServiceMock } from '@kbn/core/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { eventLogServiceMock } from '@kbn/event-log-plugin/server/event_log_service.mock';
import { KibanaRequest } from '@kbn/core/server';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import { KibanaFeature } from '@kbn/features-plugin/server';
import { AlertingConfig } from './config';
import { RuleType } from './types';
import { eventLogMock } from '@kbn/event-log-plugin/server/mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { dataPluginMock } from '@kbn/data-plugin/server/mocks';
import { dataPluginMock as autocompletePluginMock } from '@kbn/unified-search-plugin/server/mocks';
import { monitoringCollectionMock } from '@kbn/monitoring-collection-plugin/server/mocks';
import {
  DataViewsServerPluginStart,
  PluginSetup as DataPluginSetup,
} from '@kbn/data-plugin/server';
import { spacesMock } from '@kbn/spaces-plugin/server/mocks';
import { schema } from '@kbn/config-schema';
import { serverlessPluginMock } from '@kbn/serverless/server/mocks';
import { AlertsService } from './alerts_service/alerts_service';
import { alertsServiceMock } from './alerts_service/alerts_service.mock';

const mockAlertService = alertsServiceMock.create();
jest.mock('./alerts_service/alerts_service', () => ({
  AlertsService: jest.fn().mockImplementation(() => mockAlertService),
}));
import { SharePluginStart } from '@kbn/share-plugin/server';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { generateAlertingConfig } from './test_utils';

const sampleRuleType: RuleType<never, never, {}, never, never, 'default', 'recovered', {}> = {
  id: 'test',
  name: 'test',
  minimumLicenseRequired: 'basic',
  isExportable: true,
  actionGroups: [],
  defaultActionGroupId: 'default',
  category: 'test',
  producer: 'test',
  async executor() {
    return { state: {} };
  },
  validate: {
    params: { validate: (params) => params },
  },
};

describe('Alerting Plugin', () => {
  for (const useDataStreamForAlerts of [false, true]) {
    const label = useDataStreamForAlerts ? 'data streams' : 'aliases';

    describe(`using ${label} for alert indices`, () => {
      describe('setup()', () => {
        const encryptedSavedObjectsSetup = encryptedSavedObjectsMock.createSetup();
        const setupMocks = coreMock.createSetup();
        const mockPlugins = {
          licensing: licensingMock.createSetup(),
          encryptedSavedObjects: encryptedSavedObjectsSetup,
          taskManager: taskManagerMock.createSetup(),
          eventLog: eventLogServiceMock.create(),
          actions: actionsMock.createSetup(),
          statusService: statusServiceMock.createSetupContract(),
          monitoringCollection: monitoringCollectionMock.createSetup(),
          data: dataPluginMock.createSetupContract() as unknown as DataPluginSetup,
          features: featuresPluginMock.createSetup(),
          unifiedSearch: autocompletePluginMock.createSetupContract(),
          ...(useDataStreamForAlerts
            ? { serverless: serverlessPluginMock.createSetupContract() }
            : {}),
        };

        let plugin: AlertingPlugin;

        beforeEach(() => jest.clearAllMocks());

        it('should log warning when Encrypted Saved Objects plugin is missing encryption key', async () => {
          const context = coreMock.createPluginInitializerContext<AlertingConfig>(
            generateAlertingConfig()
          );
          plugin = new AlertingPlugin(context);

          plugin.setup(setupMocks, mockPlugins);
          await waitForSetupComplete(setupMocks);

          expect(setupMocks.status.set).toHaveBeenCalledTimes(1);
          expect(encryptedSavedObjectsSetup.canEncrypt).toEqual(false);
          expect(context.logger.get().warn).toHaveBeenCalledWith(
            'APIs are disabled because the Encrypted Saved Objects plugin is missing encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.'
          );
        });

        it('should create usage counter if usageCollection plugin is defined', async () => {
          const context = coreMock.createPluginInitializerContext<AlertingConfig>(
            generateAlertingConfig()
          );
          plugin = new AlertingPlugin(context);

          const usageCollectionSetup = createUsageCollectionSetupMock();

          // need await to test number of calls of setupMocks.status.set, because it is under async function which awaiting core.getStartServices()
          plugin.setup(setupMocks, { ...mockPlugins, usageCollection: usageCollectionSetup });
          await waitForSetupComplete(setupMocks);

          expect(usageCollectionSetup.createUsageCounter).toHaveBeenCalled();
          expect(usageCollectionSetup.registerCollector).toHaveBeenCalled();
        });

        it('should initialize AlertsService if enableFrameworkAlerts config is true', async () => {
          const context = coreMock.createPluginInitializerContext<AlertingConfig>({
            ...generateAlertingConfig(),
            enableFrameworkAlerts: true,
          });
          plugin = new AlertingPlugin(context);

          // need await to test number of calls of setupMocks.status.set, because it is under async function which awaiting core.getStartServices()
          const setupContract = plugin.setup(setupMocks, mockPlugins);
          await waitForSetupComplete(setupMocks);

          expect(AlertsService).toHaveBeenCalled();

          expect(setupContract.frameworkAlerts.enabled()).toEqual(true);
        });

        it('should not initialize AlertsService if node.roles.migrator is true', async () => {
          const context = coreMock.createPluginInitializerContext<AlertingConfig>({
            ...generateAlertingConfig(),
            enableFrameworkAlerts: true,
          });
          context.node.roles.migrator = true;
          plugin = new AlertingPlugin(context);

          // need await to test number of calls of setupMocks.status.set, because it is under async function which awaiting core.getStartServices()
          const setupContract = plugin.setup(setupMocks, mockPlugins);
          await waitForSetupComplete(setupMocks);

          expect(AlertsService).not.toHaveBeenCalled();

          expect(setupContract.frameworkAlerts.enabled()).toEqual(true);
        });

        it(`exposes configured minimumScheduleInterval()`, async () => {
          const context = coreMock.createPluginInitializerContext<AlertingConfig>(
            generateAlertingConfig()
          );
          plugin = new AlertingPlugin(context);

          const setupContract = plugin.setup(setupMocks, mockPlugins);
          await waitForSetupComplete(setupMocks);

          expect(setupContract.getConfig()).toEqual({
            maxScheduledPerMinute: 10000,
            isUsingSecurity: false,
            minimumScheduleInterval: { value: '1m', enforce: false },
            run: { alerts: { max: 1000 }, actions: { max: 1000 } },
          });

          expect(setupContract.frameworkAlerts.enabled()).toEqual(false);
        });

        describe('registerType()', () => {
          let setup: AlertingServerSetup;
          beforeEach(async () => {
            const context = coreMock.createPluginInitializerContext<AlertingConfig>(
              generateAlertingConfig()
            );
            plugin = new AlertingPlugin(context);
            setup = plugin.setup(setupMocks, mockPlugins);
            await waitForSetupComplete(setupMocks);
          });

          it('should throw error when license type is invalid', async () => {
            expect(() =>
              setup.registerType({
                ...sampleRuleType,

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                minimumLicenseRequired: 'foo' as any,
              })
            ).toThrowErrorMatchingInlineSnapshot(`"\\"foo\\" is not a valid license type"`);
          });

          it('should not throw when license type is gold', async () => {
            setup.registerType({
              ...sampleRuleType,
              minimumLicenseRequired: 'gold',
            });
          });

          it('should not throw when license type is basic', async () => {
            setup.registerType({
              ...sampleRuleType,
              minimumLicenseRequired: 'basic',
            });
          });

          it('should apply default config value for ruleTaskTimeout if no value is specified', async () => {
            const ruleType = {
              ...sampleRuleType,
              minimumLicenseRequired: 'basic',
            } as RuleType<never, never, {}, never, never, 'default', never, {}>;

            setup.registerType(ruleType);
            expect(ruleType.ruleTaskTimeout).toBe('5m');
          });

          it('should apply value for ruleTaskTimeout if specified', async () => {
            const ruleType = {
              ...sampleRuleType,
              minimumLicenseRequired: 'basic',
              ruleTaskTimeout: '20h',
            } as RuleType<never, never, {}, never, never, 'default', never, {}>;
            setup.registerType(ruleType);
            expect(ruleType.ruleTaskTimeout).toBe('20h');
          });

          it('should apply default config value for cancelAlertsOnRuleTimeout if no value is specified', async () => {
            const ruleType = {
              ...sampleRuleType,
              minimumLicenseRequired: 'basic',
            } as RuleType<never, never, {}, never, never, 'default', never, {}>;
            setup.registerType(ruleType);
            expect(ruleType.cancelAlertsOnRuleTimeout).toBe(true);
          });

          it('should apply value for cancelAlertsOnRuleTimeout if specified', async () => {
            const ruleType = {
              ...sampleRuleType,
              minimumLicenseRequired: 'basic',
              cancelAlertsOnRuleTimeout: false,
            } as RuleType<never, never, {}, never, never, 'default', never, {}>;
            setup.registerType(ruleType);
            expect(ruleType.cancelAlertsOnRuleTimeout).toBe(false);
          });
        });

        describe('registerConnectorAdapter()', () => {
          let setup: AlertingServerSetup;

          beforeEach(async () => {
            const context = coreMock.createPluginInitializerContext<AlertingConfig>(
              generateAlertingConfig()
            );

            plugin = new AlertingPlugin(context);
            setup = await plugin.setup(setupMocks, mockPlugins);
          });

          it('should register a connector adapter', () => {
            const adapter = {
              connectorTypeId: '.test',
              ruleActionParamsSchema: schema.object({}),
              buildActionParams: jest.fn(),
            };

            setup.registerConnectorAdapter(adapter);

            // @ts-expect-error: private properties cannot be accessed
            expect(plugin.connectorAdapterRegistry.get('.test')).toEqual(adapter);
          });
        });
      });

      describe('start()', () => {
        describe('getRulesClientWithRequest()', () => {
          it('throws error when encryptedSavedObjects plugin is missing encryption key', async () => {
            const context = coreMock.createPluginInitializerContext<AlertingConfig>(
              generateAlertingConfig()
            );
            const plugin = new AlertingPlugin(context);

            const encryptedSavedObjectsSetup = encryptedSavedObjectsMock.createSetup();
            plugin.setup(coreMock.createSetup(), {
              licensing: licensingMock.createSetup(),
              encryptedSavedObjects: encryptedSavedObjectsSetup,
              taskManager: taskManagerMock.createSetup(),
              eventLog: eventLogServiceMock.create(),
              actions: actionsMock.createSetup(),
              statusService: statusServiceMock.createSetupContract(),
              monitoringCollection: monitoringCollectionMock.createSetup(),
              data: dataPluginMock.createSetupContract() as unknown as DataPluginSetup,
              features: featuresPluginMock.createSetup(),
              unifiedSearch: autocompletePluginMock.createSetupContract(),
              ...(useDataStreamForAlerts
                ? { serverless: serverlessPluginMock.createSetupContract() }
                : {}),
            });

            const startContract = plugin.start(coreMock.createStart(), {
              actions: actionsMock.createStart(),
              encryptedSavedObjects: encryptedSavedObjectsMock.createStart(),
              features: mockFeatures(),
              spaces: spacesMock.createStart(),
              licensing: licensingMock.createStart(),
              eventLog: eventLogMock.createStart(),
              taskManager: taskManagerMock.createStart(),
              data: dataPluginMock.createStartContract(),
              share: {} as SharePluginStart,
              dataViews: {
                dataViewsServiceFactory: jest
                  .fn()
                  .mockResolvedValue(dataViewPluginMocks.createStartContract()),
                getScriptedFieldsEnabled: jest.fn().mockReturnValue(true),
              } as DataViewsServerPluginStart,
            });

            expect(encryptedSavedObjectsSetup.canEncrypt).toEqual(false);
            await expect(() =>
              startContract.getRulesClientWithRequest({} as KibanaRequest)
            ).rejects.toThrowErrorMatchingInlineSnapshot(
              `"Unable to create alerts client because the Encrypted Saved Objects plugin is missing encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command."`
            );
          });

          it(`doesn't throw error when encryptedSavedObjects plugin has encryption key`, async () => {
            const context = coreMock.createPluginInitializerContext<AlertingConfig>(
              generateAlertingConfig()
            );
            const plugin = new AlertingPlugin(context);

            const encryptedSavedObjectsSetup = {
              ...encryptedSavedObjectsMock.createSetup(),
              canEncrypt: true,
            };
            plugin.setup(coreMock.createSetup(), {
              licensing: licensingMock.createSetup(),
              encryptedSavedObjects: encryptedSavedObjectsSetup,
              taskManager: taskManagerMock.createSetup(),
              eventLog: eventLogServiceMock.create(),
              actions: actionsMock.createSetup(),
              statusService: statusServiceMock.createSetupContract(),
              monitoringCollection: monitoringCollectionMock.createSetup(),
              data: dataPluginMock.createSetupContract() as unknown as DataPluginSetup,
              features: featuresPluginMock.createSetup(),
              unifiedSearch: autocompletePluginMock.createSetupContract(),
              ...(useDataStreamForAlerts
                ? { serverless: serverlessPluginMock.createSetupContract() }
                : {}),
            });

            const startContract = plugin.start(coreMock.createStart(), {
              actions: actionsMock.createStart(),
              encryptedSavedObjects: encryptedSavedObjectsMock.createStart(),
              features: mockFeatures(),
              spaces: spacesMock.createStart(),
              licensing: licensingMock.createStart(),
              eventLog: eventLogMock.createStart(),
              taskManager: taskManagerMock.createStart(),
              data: dataPluginMock.createStartContract(),
              share: {} as SharePluginStart,
              dataViews: {
                dataViewsServiceFactory: jest
                  .fn()
                  .mockResolvedValue(dataViewPluginMocks.createStartContract()),
                getScriptedFieldsEnabled: jest.fn().mockReturnValue(true),
              } as DataViewsServerPluginStart,
            });

            const fakeRequest = {
              headers: {},
              getBasePath: () => '',
              path: '/',
              route: { settings: {} },
              url: {
                href: '/',
              },
              raw: {
                req: {
                  url: '/',
                },
              },
              getSavedObjectsClient: jest.fn(),
            } as unknown as KibanaRequest;

            await startContract.getRulesClientWithRequest(fakeRequest);
          });
        });

        test(`exposes getAlertingAuthorizationWithRequest()`, async () => {
          const context = coreMock.createPluginInitializerContext<AlertingConfig>(
            generateAlertingConfig()
          );
          const plugin = new AlertingPlugin(context);

          const encryptedSavedObjectsSetup = {
            ...encryptedSavedObjectsMock.createSetup(),
            canEncrypt: true,
          };
          plugin.setup(coreMock.createSetup(), {
            licensing: licensingMock.createSetup(),
            encryptedSavedObjects: encryptedSavedObjectsSetup,
            taskManager: taskManagerMock.createSetup(),
            eventLog: eventLogServiceMock.create(),
            actions: actionsMock.createSetup(),
            statusService: statusServiceMock.createSetupContract(),
            monitoringCollection: monitoringCollectionMock.createSetup(),
            data: dataPluginMock.createSetupContract() as unknown as DataPluginSetup,
            features: featuresPluginMock.createSetup(),
            unifiedSearch: autocompletePluginMock.createSetupContract(),
            ...(useDataStreamForAlerts
              ? { serverless: serverlessPluginMock.createSetupContract() }
              : {}),
          });

          const startContract = plugin.start(coreMock.createStart(), {
            actions: actionsMock.createStart(),
            encryptedSavedObjects: encryptedSavedObjectsMock.createStart(),
            features: mockFeatures(),
            spaces: spacesMock.createStart(),
            licensing: licensingMock.createStart(),
            eventLog: eventLogMock.createStart(),
            taskManager: taskManagerMock.createStart(),
            data: dataPluginMock.createStartContract(),
            share: {} as SharePluginStart,
            dataViews: {
              dataViewsServiceFactory: jest
                .fn()
                .mockResolvedValue(dataViewPluginMocks.createStartContract()),
              getScriptedFieldsEnabled: jest.fn().mockReturnValue(true),
            } as DataViewsServerPluginStart,
          });

          const fakeRequest = {
            headers: {},
            getBasePath: () => '',
            path: '/',
            route: { settings: {} },
            url: {
              href: '/',
            },
            raw: {
              req: {
                url: '/',
              },
            },
            getSavedObjectsClient: jest.fn(),
          } as unknown as KibanaRequest;

          await startContract.getAlertingAuthorizationWithRequest(fakeRequest);
        });
      });
    });
  }
});

function mockFeatures() {
  const features = featuresPluginMock.createSetup();
  features.getKibanaFeatures.mockReturnValue([
    new KibanaFeature({
      id: 'appName',
      name: 'appName',
      app: [],
      category: { id: 'foo', label: 'foo' },
      privileges: {
        all: {
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
        read: {
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
      },
    }),
  ]);
  return features;
}

type CoreSetupMocks = ReturnType<typeof coreMock.createSetup>;

const WaitForSetupAttempts = 10;
const WaitForSetupDelay = 200;
const WaitForSetupSeconds = (WaitForSetupAttempts * WaitForSetupDelay) / 1000;

// wait for setup to *really* complete: waiting for calls to
// setupMocks.status.set, which needs to wait for core.getStartServices()
export async function waitForSetupComplete(setupMocks: CoreSetupMocks) {
  let attempts = 0;
  while (setupMocks.status.set.mock.calls.length < 1) {
    attempts++;
    await new Promise((resolve) => setTimeout(resolve, WaitForSetupDelay));
    if (attempts > WaitForSetupAttempts) {
      throw new Error(`setupMocks.status.set was not called within ${WaitForSetupSeconds} seconds`);
    }
  }
}
