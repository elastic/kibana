/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingServerSetup } from './plugin';
import { AlertingPlugin } from './plugin';
import {
  type PluginInitializerContextMock,
  coreMock,
  statusServiceMock,
} from '@kbn/core/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { eventLogServiceMock } from '@kbn/event-log-plugin/server/event_log_service.mock';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import type { AlertingConfig } from './config';
import type { RuleType } from './types';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { dataPluginMock } from '@kbn/data-plugin/server/mocks';
import { dataPluginMock as autocompletePluginMock } from '@kbn/unified-search-plugin/server/mocks';
import { monitoringCollectionMock } from '@kbn/monitoring-collection-plugin/server/mocks';
import type { PluginSetup as DataPluginSetup } from '@kbn/data-plugin/server';
import { alertsServiceMock } from './alerts_service/alerts_service.mock';

const mockAlertService = alertsServiceMock.create();
jest.mock('./alerts_service/alerts_service', () => ({
  AlertsService: jest.fn().mockImplementation(() => mockAlertService),
}));
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
  solution: 'stack',
  async executor() {
    return { state: {} };
  },
  validate: {
    params: { validate: (params) => params },
  },
};

describe('Alerting Plugin - cancelAlertsOnRuleTimeout', () => {
  describe('registerType()', () => {
    const encryptedSavedObjectsSetup = encryptedSavedObjectsMock.createSetup({ canEncrypt: true });
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
    };

    let context: PluginInitializerContextMock<AlertingConfig>;
    let plugin: AlertingPlugin;
    let setup: AlertingServerSetup;

    async function setupHelper(configOverwrites = {}) {
      context = coreMock.createPluginInitializerContext<AlertingConfig>(
        generateAlertingConfig(configOverwrites)
      );
      plugin = new AlertingPlugin(context);
      setup = plugin.setup(setupMocks, mockPlugins);
      await waitForSetupComplete(setupMocks);
    }

    beforeEach(() => jest.clearAllMocks());

    for (const cancelAlertsOnRuleTimeoutInConfig of [true, false]) {
      describe(`xpack.alerting.cancelAlertsOnRuleTimeout=${cancelAlertsOnRuleTimeoutInConfig}`, () => {
        beforeEach(async () => {
          await setupHelper({ cancelAlertsOnRuleTimeout: cancelAlertsOnRuleTimeoutInConfig });
        });
        describe('should prioritize explicit settings on rule type definition', () => {
          it('should register rule type when autoRecoverAlerts=true and cancelAlertsOnRuleTimeout=true', async () => {
            setup.registerType({
              ...sampleRuleType,
              autoRecoverAlerts: true,
              cancelAlertsOnRuleTimeout: true,
            });
            // @ts-expect-error: private properties cannot be accessed
            expect(plugin.ruleTypeRegistry.get('test').id).toBe('test');
            // @ts-expect-error: private properties cannot be accessed
            expect(plugin.ruleTypeRegistry.get('test').autoRecoverAlerts).toBe(true);
            // @ts-expect-error: private properties cannot be accessed
            expect(plugin.ruleTypeRegistry.get('test').cancelAlertsOnRuleTimeout).toBe(true);
          });
          it('should throw when autoRecoverAlerts=true and cancelAlertsOnRuleTimeout=false', async () => {
            expect(() =>
              setup.registerType({
                ...sampleRuleType,
                autoRecoverAlerts: true,
                cancelAlertsOnRuleTimeout: false,
              })
            ).toThrowErrorMatchingInlineSnapshot(
              `"Rule type \\"test\\" cannot have both cancelAlertsOnRuleTimeout set to false and autoRecoverAlerts set to true."`
            );
          });
          it('should register rule type when autoRecoverAlerts=false and cancelAlertsOnRuleTimeout=true', async () => {
            setup.registerType({
              ...sampleRuleType,
              autoRecoverAlerts: false,
              cancelAlertsOnRuleTimeout: true,
            });
            // @ts-expect-error: private properties cannot be accessed
            expect(plugin.ruleTypeRegistry.get('test').id).toBe('test');
            // @ts-expect-error: private properties cannot be accessed
            expect(plugin.ruleTypeRegistry.get('test').autoRecoverAlerts).toBe(false);
            // @ts-expect-error: private properties cannot be accessed
            expect(plugin.ruleTypeRegistry.get('test').cancelAlertsOnRuleTimeout).toBe(true);
          });
          it('should register rule type when autoRecoverAlerts=false and cancelAlertsOnRuleTimeout=false', async () => {
            setup.registerType({
              ...sampleRuleType,
              autoRecoverAlerts: false,
              cancelAlertsOnRuleTimeout: false,
            });
            // @ts-expect-error: private properties cannot be accessed
            expect(plugin.ruleTypeRegistry.get('test').id).toBe('test');
            // @ts-expect-error: private properties cannot be accessed
            expect(plugin.ruleTypeRegistry.get('test').autoRecoverAlerts).toBe(false);
            // @ts-expect-error: private properties cannot be accessed
            expect(plugin.ruleTypeRegistry.get('test').cancelAlertsOnRuleTimeout).toBe(false);
          });
        });

        it('should log warning when config is set to false', async () => {
          if (cancelAlertsOnRuleTimeoutInConfig === false) {
            expect(context.logger.get().warn).toHaveBeenCalledWith(
              `Setting xpack.alerting.cancelAlertsOnRuleTimeout=false can lead to unexpected behavior for certain rule types. This setting will be deprecated in a future version and will be ignored for rule types that do not support it.`
            );
          } else {
            expect(context.logger.get().warn).not.toHaveBeenCalled();
          }
        });

        it('should register lifecycle rule type', async () => {
          setup.registerType({
            ...sampleRuleType,
            autoRecoverAlerts: true,
          });
          // @ts-expect-error: private properties cannot be accessed
          expect(plugin.ruleTypeRegistry.get('test').id).toBe('test');
          // @ts-expect-error: private properties cannot be accessed
          expect(plugin.ruleTypeRegistry.get('test').autoRecoverAlerts).toBe(true);
          // @ts-expect-error: private properties cannot be accessed

          // this is registered as true even if config is set to false
          expect(plugin.ruleTypeRegistry.get('test').cancelAlertsOnRuleTimeout).toBe(true);

          if (cancelAlertsOnRuleTimeoutInConfig) {
            expect(context.logger.get().debug).not.toHaveBeenCalled();
          } else {
            expect(context.logger.get().debug).toHaveBeenCalledWith(
              `Setting xpack.alerting.cancelAlertsOnRuleTimeout=false is incompatible with rule type \"test\" and will be ignored.`
            );
          }
        });

        it('should register non-lifecycle rule type', async () => {
          setup.registerType({
            ...sampleRuleType,
            autoRecoverAlerts: false,
          });
          // @ts-expect-error: private properties cannot be accessed
          expect(plugin.ruleTypeRegistry.get('test').id).toBe('test');
          // @ts-expect-error: private properties cannot be accessed
          expect(plugin.ruleTypeRegistry.get('test').autoRecoverAlerts).toBe(false);
          // @ts-expect-error: private properties cannot be accessed

          // this should match the config value
          expect(plugin.ruleTypeRegistry.get('test').cancelAlertsOnRuleTimeout).toBe(
            cancelAlertsOnRuleTimeoutInConfig
          );

          expect(context.logger.get().debug).not.toHaveBeenCalled();
        });
      });
    }
  });
});

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
