/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { UntypedNormalizedRuleType } from '../rule_type_registry';
import { AlertInstanceContext, MaintenanceWindowStatus, RecoveredActionGroup } from '../types';
import { LegacyAlertsClient } from './legacy_alerts_client';
import { createAlertFactory, getPublicAlertFactory } from '../alert/create_alert_factory';
import { Alert } from '../alert/alert';
import { ruleRunMetricsStoreMock } from '../lib/rule_run_metrics_store.mock';
import { getAlertsForNotification, processAlerts } from '../lib';
import { trimRecoveredAlerts } from '../lib/trim_recovered_alerts';
import { DEFAULT_FLAPPING_SETTINGS } from '../../common/rules_settings';
import { schema } from '@kbn/config-schema';
import { maintenanceWindowsServiceMock } from '../task_runner/maintenance_windows/maintenance_windows_service.mock';
import { getMockMaintenanceWindow } from '../data/maintenance_window/test_helpers';
import { KibanaRequest } from '@kbn/core/server';
import { alertingEventLoggerMock } from '../lib/alerting_event_logger/alerting_event_logger.mock';

const maintenanceWindowsService = maintenanceWindowsServiceMock.create();
const scheduleActions = jest.fn();
const replaceState = jest.fn(() => ({ scheduleActions }));
const mockCreateAlert = jest.fn(() => ({ replaceState, scheduleActions }));
const mockGetAlert = jest.fn();
const mockGetRecoveredAlerts = jest.fn().mockReturnValue([]);
const mockSetLimitReached = jest.fn();
const mockCreateAlertFactory = {
  create: mockCreateAlert,
  get: mockGetAlert,
  hasReachedAlertLimit: jest.fn().mockReturnValue(false),
  alertLimit: {
    getValue: jest.fn().mockReturnValue(1000),
    setLimitReached: mockSetLimitReached,
    checkLimitUsage: jest.fn(),
  },
  done: () => ({
    getRecoveredAlerts: mockGetRecoveredAlerts,
  }),
};
jest.mock('../alert/create_alert_factory', () => {
  const original = jest.requireActual('../alert/create_alert_factory');
  return {
    ...original,
    getPublicAlertFactory: jest.fn().mockImplementation(() => {
      return {
        create: mockCreateAlert,
        alertLimit: {
          getValue: jest.fn().mockReturnValue(1000),
          setLimitReached: mockSetLimitReached,
        },
        done: () => ({
          getRecoveredAlerts: mockGetRecoveredAlerts,
        }),
      };
    }),
    createAlertFactory: jest.fn().mockImplementation(() => mockCreateAlertFactory),
  };
});

jest.mock('../lib', () => {
  const original = jest.requireActual('../lib');
  return {
    ...original,
    processAlerts: jest.fn(),
    setFlapping: jest.fn(),
  };
});

jest.mock('../lib/trim_recovered_alerts', () => {
  return {
    trimRecoveredAlerts: jest.fn(),
  };
});

jest.mock('../lib/get_alerts_for_notification', () => {
  return {
    getAlertsForNotification: jest.fn(),
  };
});

jest.mock('../task_runner/log_alerts', () => ({ logAlerts: jest.fn() }));

let logger: ReturnType<(typeof loggingSystemMock)['createLogger']>;
const ruleRunMetricsStore = ruleRunMetricsStoreMock.create();
const alertingEventLogger = alertingEventLoggerMock.create();

const ruleType: jest.Mocked<UntypedNormalizedRuleType> = {
  id: 'test',
  name: 'My test rule',
  actionGroups: [{ id: 'default', name: 'Default' }, RecoveredActionGroup],
  defaultActionGroupId: 'default',
  minimumLicenseRequired: 'basic',
  isExportable: true,
  recoveryActionGroup: RecoveredActionGroup,
  executor: jest.fn(),
  category: 'test',
  producer: 'alerts',
  cancelAlertsOnRuleTimeout: true,
  ruleTaskTimeout: '5m',
  validate: {
    params: schema.any(),
  },
  validLegacyConsumers: [],
};

const testAlert1 = {
  state: { foo: 'bar' },
  meta: { flapping: false, flappingHistory: [false, false], uuid: 'abc' },
};
const testAlert2 = {
  state: { any: 'value' },
  meta: {
    lastScheduledActions: {
      group: 'default',
      date: new Date().toISOString(),
    },
    uuid: 'def',
  },
};

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

const defaultExecutionOpts = {
  maxAlerts: 1000,
  ruleLabel: `test: rule-name`,
  flappingSettings: DEFAULT_FLAPPING_SETTINGS,
  activeAlertsFromState: {
    '1': testAlert1,
    '2': testAlert2,
  },
  recoveredAlertsFromState: {},
  startedAt: null,
};

describe('Legacy Alerts Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggingSystemMock.createLogger();
  });

  test('initializeExecution() should create alert factory with given alerts', async () => {
    const alertsClient = new LegacyAlertsClient({
      alertingEventLogger,
      logger,
      request: fakeRequest,
      spaceId: 'space1',
      ruleType,
      maintenanceWindowsService,
    });

    await alertsClient.initializeExecution(defaultExecutionOpts);

    expect(createAlertFactory).toHaveBeenCalledWith({
      alerts: {
        '1': new Alert<AlertInstanceContext, AlertInstanceContext>('1', testAlert1),
        '2': new Alert<AlertInstanceContext, AlertInstanceContext>('2', testAlert2),
      },
      logger,
      maxAlerts: 1000,
      canSetRecoveryContext: false,
      autoRecoverAlerts: true,
    });
  });

  test('factory() should call getPublicAlertFactory on alert factory', async () => {
    const alertsClient = new LegacyAlertsClient({
      alertingEventLogger,
      logger,
      request: fakeRequest,
      spaceId: 'space1',
      ruleType,
      maintenanceWindowsService,
    });

    await alertsClient.initializeExecution(defaultExecutionOpts);

    alertsClient.factory();
    expect(getPublicAlertFactory).toHaveBeenCalledWith(mockCreateAlertFactory);
  });

  test('getAlert() should pass through to alert factory function', async () => {
    const alertsClient = new LegacyAlertsClient({
      alertingEventLogger,
      logger,
      request: fakeRequest,
      spaceId: 'space1',
      ruleType,
      maintenanceWindowsService,
    });

    await alertsClient.initializeExecution(defaultExecutionOpts);

    alertsClient.getAlert('1');
    expect(mockCreateAlertFactory.get).toHaveBeenCalledWith('1');
  });

  test('checkLimitUsage() should pass through to alert factory function', async () => {
    const alertsClient = new LegacyAlertsClient({
      alertingEventLogger,
      logger,
      request: fakeRequest,
      spaceId: 'space1',
      ruleType,
      maintenanceWindowsService,
    });

    await alertsClient.initializeExecution(defaultExecutionOpts);

    alertsClient.checkLimitUsage();
    expect(mockCreateAlertFactory.alertLimit.checkLimitUsage).toHaveBeenCalled();
  });

  test('hasReachedAlertLimit() should pass through to alert factory function', async () => {
    const alertsClient = new LegacyAlertsClient({
      alertingEventLogger,
      logger,
      request: fakeRequest,
      spaceId: 'space1',
      ruleType,
      maintenanceWindowsService,
    });

    await alertsClient.initializeExecution(defaultExecutionOpts);

    alertsClient.hasReachedAlertLimit();
    expect(mockCreateAlertFactory.hasReachedAlertLimit).toHaveBeenCalled();
  });

  test('getMaxAlertLimit() should return the maxAlertLimit', async () => {
    const alertsClient = new LegacyAlertsClient({
      alertingEventLogger,
      logger,
      request: fakeRequest,
      spaceId: 'space1',
      ruleType,
      maintenanceWindowsService,
    });

    await alertsClient.initializeExecution(defaultExecutionOpts);

    expect(alertsClient.getMaxAlertLimit()).toBe(1000);
  });

  test('processAlerts() should call processAlerts, trimRecoveredAlerts and getAlertsForNotifications', async () => {
    maintenanceWindowsService.getMaintenanceWindows.mockReturnValue({
      maintenanceWindows: [
        {
          ...getMockMaintenanceWindow(),
          eventStartTime: new Date().toISOString(),
          eventEndTime: new Date().toISOString(),
          status: MaintenanceWindowStatus.Running,
          id: 'test-id1',
        },
        {
          ...getMockMaintenanceWindow(),
          eventStartTime: new Date().toISOString(),
          eventEndTime: new Date().toISOString(),
          status: MaintenanceWindowStatus.Running,
          id: 'test-id2',
        },
      ],
      maintenanceWindowsWithoutScopedQueryIds: ['test-id1', 'test-id2'],
    });
    (processAlerts as jest.Mock).mockReturnValue({
      newAlerts: {},
      activeAlerts: {
        '1': new Alert<AlertInstanceContext, AlertInstanceContext>('1', testAlert1),
        '2': new Alert<AlertInstanceContext, AlertInstanceContext>('2', testAlert2),
      },
      currentRecoveredAlerts: {},
      recoveredAlerts: {},
    });
    (trimRecoveredAlerts as jest.Mock).mockReturnValue({
      trimmedAlertsRecovered: {},
      earlyRecoveredAlerts: {},
    });
    (getAlertsForNotification as jest.Mock).mockReturnValue({
      newAlerts: {},
      activeAlerts: {
        '1': new Alert<AlertInstanceContext, AlertInstanceContext>('1', testAlert1),
        '2': new Alert<AlertInstanceContext, AlertInstanceContext>('2', testAlert2),
      },
      currentActiveAlerts: {
        '1': new Alert<AlertInstanceContext, AlertInstanceContext>('1', testAlert1),
        '2': new Alert<AlertInstanceContext, AlertInstanceContext>('2', testAlert2),
      },
      currentRecoveredAlerts: {},
      recoveredAlerts: {},
    });
    const alertsClient = new LegacyAlertsClient({
      alertingEventLogger,
      logger,
      request: fakeRequest,
      spaceId: 'space1',
      ruleType,
      maintenanceWindowsService,
    });

    await alertsClient.initializeExecution(defaultExecutionOpts);

    await alertsClient.processAlerts({
      ruleRunMetricsStore,
      flappingSettings: DEFAULT_FLAPPING_SETTINGS,
      alertDelay: 5,
    });

    expect(processAlerts).toHaveBeenCalledWith({
      alerts: {
        '1': new Alert<AlertInstanceContext, AlertInstanceContext>('1', testAlert1),
        '2': new Alert<AlertInstanceContext, AlertInstanceContext>('2', testAlert2),
      },
      existingAlerts: {
        '1': new Alert<AlertInstanceContext, AlertInstanceContext>('1', testAlert1),
        '2': new Alert<AlertInstanceContext, AlertInstanceContext>('2', testAlert2),
      },
      previouslyRecoveredAlerts: {},
      hasReachedAlertLimit: false,
      alertLimit: 1000,
      autoRecoverAlerts: true,
      flappingSettings: DEFAULT_FLAPPING_SETTINGS,
      startedAt: null,
    });

    expect(trimRecoveredAlerts).toHaveBeenCalledWith(logger, {}, 1000);

    expect(getAlertsForNotification).toHaveBeenCalledWith(
      {
        enabled: true,
        lookBackWindow: 20,
        statusChangeThreshold: 4,
      },
      'default',
      5,
      {},
      {
        '1': new Alert<AlertInstanceContext, AlertInstanceContext>('1', testAlert1),
        '2': new Alert<AlertInstanceContext, AlertInstanceContext>('2', testAlert2),
      },
      {},
      {},
      null
    );

    expect(alertsClient.getProcessedAlerts('active')).toEqual({
      '1': new Alert<AlertInstanceContext, AlertInstanceContext>('1', testAlert1),
      '2': new Alert<AlertInstanceContext, AlertInstanceContext>('2', testAlert2),
    });

    expect(maintenanceWindowsService.getMaintenanceWindows).toHaveBeenCalledWith({
      eventLogger: alertingEventLogger,
      request: fakeRequest,
      ruleTypeCategory: 'test',
      spaceId: 'space1',
    });
  });

  test('processAlerts() should set maintenance windows IDs on new alerts', async () => {
    maintenanceWindowsService.getMaintenanceWindows.mockReturnValue({
      maintenanceWindows: [
        {
          ...getMockMaintenanceWindow(),
          eventStartTime: new Date().toISOString(),
          eventEndTime: new Date().toISOString(),
          status: MaintenanceWindowStatus.Running,
          id: 'test-id1',
        },
        {
          ...getMockMaintenanceWindow(),
          eventStartTime: new Date().toISOString(),
          eventEndTime: new Date().toISOString(),
          status: MaintenanceWindowStatus.Running,
          id: 'test-id2',
        },
      ],
      maintenanceWindowsWithoutScopedQueryIds: ['test-id1', 'test-id2'],
    });
    (processAlerts as jest.Mock).mockReturnValue({
      newAlerts: {
        '1': new Alert<AlertInstanceContext, AlertInstanceContext>('1', testAlert1),
      },
      activeAlerts: {
        '2': new Alert<AlertInstanceContext, AlertInstanceContext>('2', testAlert2),
      },
      currentRecoveredAlerts: {},
      recoveredAlerts: {},
    });
    (trimRecoveredAlerts as jest.Mock).mockReturnValue({
      trimmedAlertsRecovered: {},
      earlyRecoveredAlerts: {},
    });
    (getAlertsForNotification as jest.Mock).mockReturnValue({
      newAlerts: {
        '1': new Alert<AlertInstanceContext, AlertInstanceContext>('1', testAlert1),
      },
      activeAlerts: {
        '2': new Alert<AlertInstanceContext, AlertInstanceContext>('2', testAlert2),
      },
      currentActiveAlerts: {
        '2': new Alert<AlertInstanceContext, AlertInstanceContext>('2', testAlert2),
      },
      currentRecoveredAlerts: {},
      recoveredAlerts: {},
    });
    const alertsClient = new LegacyAlertsClient({
      alertingEventLogger,
      logger,
      request: fakeRequest,
      spaceId: 'space1',
      ruleType,
      maintenanceWindowsService,
    });

    await alertsClient.initializeExecution({
      ...defaultExecutionOpts,
      activeAlertsFromState: {
        '2': testAlert2,
      },
    });

    await alertsClient.processAlerts({
      ruleRunMetricsStore,
      flappingSettings: DEFAULT_FLAPPING_SETTINGS,
      alertDelay: 5,
    });

    expect(maintenanceWindowsService.getMaintenanceWindows).toHaveBeenCalledWith({
      eventLogger: alertingEventLogger,
      request: fakeRequest,
      ruleTypeCategory: 'test',
      spaceId: 'space1',
    });

    expect(getAlertsForNotification).toHaveBeenCalledWith(
      {
        enabled: true,
        lookBackWindow: 20,
        statusChangeThreshold: 4,
      },
      'default',
      5,
      {
        '1': new Alert<AlertInstanceContext, AlertInstanceContext>('1', {
          ...testAlert1,
          meta: { ...testAlert1.meta, maintenanceWindowIds: ['test-id1', 'test-id2'] },
        }),
      },
      {
        '2': new Alert<AlertInstanceContext, AlertInstanceContext>('2', testAlert2),
      },
      {},
      {},
      null
    );
  });

  test('isTrackedAlert() should return true if alert was active in a previous execution, false otherwise', async () => {
    const alertsClient = new LegacyAlertsClient({
      alertingEventLogger,
      logger,
      request: fakeRequest,
      spaceId: 'space1',
      ruleType,
      maintenanceWindowsService,
    });

    await alertsClient.initializeExecution(defaultExecutionOpts);
    expect(alertsClient.isTrackedAlert('1')).toBe(true);
    expect(alertsClient.isTrackedAlert('2')).toBe(true);
    expect(alertsClient.isTrackedAlert('3')).toBe(false);
  });
});
