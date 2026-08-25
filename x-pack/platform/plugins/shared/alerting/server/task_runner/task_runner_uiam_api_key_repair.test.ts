/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { usageCountersServiceMock } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counters_service.mock';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import {
  loggingSystemMock,
  savedObjectsRepositoryMock,
  executionContextServiceMock,
  savedObjectsServiceMock,
  elasticsearchServiceMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { actionsMock, actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import { eventLoggerMock } from '@kbn/event-log-plugin/server/event_logger.mock';
import type { IEventLogger } from '@kbn/event-log-plugin/server';
import { dataPluginMock } from '@kbn/data-plugin/server/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import type { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import type { SharePluginStart } from '@kbn/share-plugin/server';
import { eventLogClientMock } from '@kbn/event-log-plugin/server/mocks';
import type { Rule } from '../types';
import { DEFAULT_FLAPPING_SETTINGS, DEFAULT_QUERY_DELAY_SETTINGS } from '../types';
import { TaskRunner } from './task_runner';
import { alertsMock } from '../mocks';
import { ruleTypeRegistryMock } from '../rule_type_registry.mock';
import { inMemoryMetricsMock } from '../monitoring/in_memory_metrics.mock';
import { getAlertFromRaw } from '../rules_client/lib/get_alert_from_raw';
import { AlertingEventLogger } from '../lib/alerting_event_logger/alerting_event_logger';
import { alertingEventLoggerMock } from '../lib/alerting_event_logger/alerting_event_logger.mock';
import { mockTaskInstance, ruleType, mockedRuleTypeSavedObject, mockedRawRuleSO } from './fixtures';
import { alertsServiceMock } from '../alerts_service/alerts_service.mock';
import { ConnectorAdapterRegistry } from '../connector_adapters/connector_adapter_registry';
import { RULE_SAVED_OBJECT_TYPE } from '../saved_objects';
import type { TaskRunnerContext } from './types';
import { ApiKeyType } from './types';
import { backfillClientMock } from '../backfill_client/backfill_client.mock';
import { rulesSettingsServiceMock } from '../rules_settings/rules_settings_service.mock';
import { maintenanceWindowsServiceMock } from './maintenance_windows/maintenance_windows_service.mock';

const RULE_EXECUTION_UUID = '5f6aa57d-3e22-484e-bae8-cbed868f4d28';
jest.mock('uuid', () => ({ v4: () => RULE_EXECUTION_UUID }));
jest.mock('../lib/wrap_scoped_cluster_client', () => ({
  createWrappedScopedClusterClientFactory: jest.fn(),
}));
jest.mock('../lib/alerting_event_logger/alerting_event_logger');
jest.mock('../rules_client/lib/get_alert_from_raw');

const mockGetAlertFromRaw = getAlertFromRaw as jest.MockedFunction<typeof getAlertFromRaw>;

const STALE_UIAM_API_KEY = Buffer.from('stale-id:essu_stale').toString('base64');
const FRESH_UIAM_API_KEY = Buffer.from('fresh-id:essu_fresh').toString('base64');

/**
 * The 401 Elasticsearch returns when UIAM rejects the API key a rule run authenticated with,
 * carrying UIAM's own `APIKEY_MISSING` code.
 */
const missingUiamApiKeyError = () =>
  Object.assign(new Error('security_exception'), {
    statusCode: 401,
    body: {
      error: {
        type: 'security_exception',
        reason: 'failed to authenticate cloud api key',
        caused_by: { authentication_error_code: '0x28D520' },
      },
    },
  });

let fakeTimer: sinon.SinonFakeTimers;

const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');
const alertingEventLogger = alertingEventLoggerMock.create();
const logger: ReturnType<typeof loggingSystemMock.createLogger> = loggingSystemMock.createLogger();
const dataViewsMock = {
  dataViewsServiceFactory: jest.fn().mockResolvedValue(dataViewPluginMocks.createStartContract()),
  getScriptedFieldsEnabled: jest.fn().mockReturnValue(true),
} as DataViewsServerPluginStart;

describe('Task Runner UIAM API key repair', () => {
  let mockedTaskInstance: ConcreteTaskInstance;

  beforeAll(() => {
    fakeTimer = sinon.useFakeTimers(new Date('2026-08-14T12:00:00.000Z'));
    mockedTaskInstance = mockTaskInstance();
  });

  afterAll(() => fakeTimer.restore());

  const encryptedSavedObjectsClient = encryptedSavedObjectsMock.createClient();
  const services = alertsMock.createRuleExecutorServices();
  const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();
  const ruleTypeRegistry = ruleTypeRegistryMock.create();
  const savedObjectsService = savedObjectsServiceMock.createInternalStartContract();
  const elasticsearchService = elasticsearchServiceMock.createInternalStart();
  const inMemoryMetrics = inMemoryMetricsMock.create();
  const rulesSettingsService = rulesSettingsServiceMock.create();
  const maintenanceWindowsService = maintenanceWindowsServiceMock.create();
  const actionsClient = actionsClientMock.create();
  const unsafeSavedObjectsClient = savedObjectsServiceMock
    .createStartContract()
    .getUnsafeInternalClient();

  const uiamConvert = jest.fn();

  const context: jest.Mocked<TaskRunnerContext> & {
    actionsPlugin: jest.Mocked<ActionsPluginStart>;
    eventLogger: jest.Mocked<IEventLogger>;
    executionContext: ReturnType<typeof executionContextServiceMock.createInternalStartContract>;
  } = {
    actionsConfigMap: { default: { max: 1000 } },
    actionsPlugin: actionsMock.createStart(),
    alertsService: alertsServiceMock.create(),
    backfillClient: backfillClientMock.create(),
    cancelAlertsOnRuleTimeout: true,
    connectorAdapterRegistry: new ConnectorAdapterRegistry(),
    data: dataPluginMock.createStartContract(),
    dataViews: dataViewsMock,
    elasticsearch: elasticsearchService,
    encryptedSavedObjectsClient,
    eventLogger: eventLoggerMock.create(),
    executionContext: executionContextServiceMock.createInternalStartContract(),
    kibanaBaseUrl: 'https://localhost:5601',
    logger,
    maintenanceWindowsService,
    maxAlerts: 1000,
    ruleTypeRegistry,
    rulesSettingsService,
    savedObjects: savedObjectsService,
    share: {} as SharePluginStart,
    spaceIdToNamespace: jest.fn().mockReturnValue(undefined),
    uiSettings: uiSettingsServiceMock.createStartContract(),
    usageCounter: mockUsageCounter,
    isServerless: true,
    getEventLogClient: jest.fn().mockReturnValue(eventLogClientMock.create()),
    apiKeyType: ApiKeyType.UIAM,
    shouldGrantUiam: true,
    uiamConvert,
  };

  const uiamRuleSO = {
    ...mockedRawRuleSO,
    attributes: {
      ...mockedRawRuleSO.attributes,
      uiamApiKey: STALE_UIAM_API_KEY,
      apiKeyCreatedByUser: false,
    },
  };

  beforeEach(() => {
    jest.resetAllMocks();
    jest
      .requireMock('../lib/wrap_scoped_cluster_client')
      .createWrappedScopedClusterClientFactory.mockReturnValue({
        client: () => services.scopedClusterClient,
        getMetrics: () => ({ numSearches: 0, esSearchDurationMs: 0, totalSearchDurationMs: 0 }),
      });
    savedObjectsService.getScopedClient.mockReturnValue(services.savedObjectsClient);
    savedObjectsService.getUnsafeInternalClient = jest
      .fn()
      .mockReturnValue(unsafeSavedObjectsClient);
    elasticsearchService.client.asScoped.mockReturnValue(services.scopedClusterClient);
    context.actionsPlugin.getActionsClientWithRequest.mockResolvedValue(actionsClient);
    context.executionContext.withContext.mockImplementation((ctx, fn) => fn());
    ruleTypeRegistry.get.mockReturnValue(ruleType);
    rulesSettingsService.getSettings.mockResolvedValue({
      flappingSettings: DEFAULT_FLAPPING_SETTINGS,
      queryDelaySettings: DEFAULT_QUERY_DELAY_SETTINGS,
    });
    mockGetAlertFromRaw.mockReturnValue(mockedRuleTypeSavedObject as Rule);
    maintenanceWindowsService.getMaintenanceWindows.mockReturnValue({
      maintenanceWindows: [],
      maintenanceWindowsWithoutScopedQueryIds: [],
    });
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(uiamRuleSO);
    alertingEventLogger.getStartAndDuration.mockImplementation(() => ({ start: new Date() }));
    (AlertingEventLogger as jest.Mock).mockImplementation(() => alertingEventLogger);
    logger.get.mockImplementation(() => logger);
    uiamConvert.mockResolvedValue({
      results: [{ status: 'success', id: 'fresh-id', key: 'essu_fresh' }],
    });
    internalSavedObjectsRepository.update.mockResolvedValue({
      id: '1',
      type: RULE_SAVED_OBJECT_TYPE,
      attributes: {},
      references: [],
    });
  });

  const createTaskRunner = () =>
    new TaskRunner({
      ruleType,
      taskInstance: mockedTaskInstance,
      context,
      inMemoryMetrics,
      internalSavedObjectsRepository,
      executionUuid: RULE_EXECUTION_UUID,
    });

  test('re-grants the UIAM API key when a run fails to authenticate with it', async () => {
    ruleType.executor.mockRejectedValue(missingUiamApiKeyError());

    const runResult = await createTaskRunner().run();

    expect(uiamConvert).toHaveBeenCalledWith([uiamRuleSO.attributes.apiKey]);
    expect(unsafeSavedObjectsClient.update).toHaveBeenCalledWith(
      RULE_SAVED_OBJECT_TYPE,
      '1',
      expect.objectContaining({ uiamApiKey: FRESH_UIAM_API_KEY }),
      expect.objectContaining({ mergeAttributes: false, version: uiamRuleSO.version })
    );
    // The re-grant does not disturb the run's own reporting: the rule keeps its schedule and the
    // failure is still surfaced, it just authenticates with a working key from the next run on.
    expect(runResult.schedule).toEqual({ interval: '10s' });
    expect(runResult.taskRunError).toBeDefined();
    expect(alertingEventLogger.done).toHaveBeenCalledWith(
      expect.objectContaining({ status: expect.objectContaining({ status: 'error' }) })
    );
  });

  test('leaves the key alone when the run failed for an unrelated reason', async () => {
    ruleType.executor.mockRejectedValue(new Error('rule executor failed'));

    const runResult = await createTaskRunner().run();

    expect(uiamConvert).not.toHaveBeenCalled();
    expect(unsafeSavedObjectsClient.update).not.toHaveBeenCalled();
    expect(runResult.schedule).toEqual({ interval: '10s' });
  });

  test('still reports the run normally when the key could not be re-granted', async () => {
    ruleType.executor.mockRejectedValue(missingUiamApiKeyError());
    uiamConvert.mockResolvedValue({
      results: [{ status: 'failed', code: '0xCEE791', message: 'ES API key not found' }],
    });

    const runResult = await createTaskRunner().run();

    expect(unsafeSavedObjectsClient.update).not.toHaveBeenCalled();
    expect(runResult.schedule).toEqual({ interval: '10s' });
    expect(runResult.taskRunError).toBeDefined();
  });
});
