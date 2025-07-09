/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('uuid', () => {
  let counter = 1;
  return {
    v4: () => `uuid-module-v4-called-${counter++}`,
  };
});

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { Alert } from '../alert';
import { alertingEventLoggerMock } from '../lib/alerting_event_logger/alerting_event_logger.mock';
import { RuleRunMetricsStore } from '../lib/rule_run_metrics_store';
import type { DefaultActionGroupId } from '../types';
import { logAlerts } from './log_alerts';

const logger: ReturnType<typeof loggingSystemMock.createLogger> = loggingSystemMock.createLogger();
const alertingEventLogger = alertingEventLoggerMock.create();

describe('logAlerts', () => {
  let ruleRunMetricsStore: RuleRunMetricsStore;

  beforeEach(() => {
    jest.resetAllMocks();
    logger.isLevelEnabled.mockReturnValue(true);
    ruleRunMetricsStore = new RuleRunMetricsStore();
  });

  test('should debug log active alerts if they exist', () => {
    const activeAlerts = new Map();
    activeAlerts.set('1', new Alert<{}, {}, DefaultActionGroupId>('1'));
    activeAlerts.set('2', new Alert<{}, {}, DefaultActionGroupId>('2'));
    logAlerts({
      logger,
      alertingEventLogger,
      newAlerts: new Map(),
      activeAlerts,
      recoveredAlerts: new Map(),
      ruleLogPrefix: `test-rule-type-id:123: 'test rule'`,
      ruleRunMetricsStore,
      canSetRecoveryContext: false,
      shouldPersistAlerts: true,
    });

    expect(logger.debug).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenNthCalledWith(
      1,
      `rule test-rule-type-id:123: 'test rule' has 2 active alerts: [{\"instanceId\":\"1\"},{\"instanceId\":\"2\"}]`
    );
  });

  test('should debug log recovered alerts if they exist', () => {
    const activeAlerts = new Map();
    activeAlerts.set('1', new Alert<{}, {}, DefaultActionGroupId>('1'));
    activeAlerts.set('2', new Alert<{}, {}, DefaultActionGroupId>('2'));

    const recoveredAlerts = new Map();
    recoveredAlerts.set('8', new Alert<{}, {}, DefaultActionGroupId>('8'));

    logAlerts({
      logger,
      alertingEventLogger,
      newAlerts: new Map(),
      activeAlerts,
      recoveredAlerts,
      ruleLogPrefix: `test-rule-type-id:123: 'test rule'`,
      ruleRunMetricsStore,
      canSetRecoveryContext: false,
      shouldPersistAlerts: true,
    });

    expect(logger.debug).toHaveBeenCalledTimes(2);
    expect(logger.debug).toHaveBeenNthCalledWith(
      1,
      `rule test-rule-type-id:123: 'test rule' has 2 active alerts: [{\"instanceId\":\"1\"},{\"instanceId\":\"2\"}]`
    );
    expect(logger.debug).toHaveBeenNthCalledWith(
      2,
      `rule test-rule-type-id:123: 'test rule' has 1 recovered alerts: [\"8\"]`
    );
  });

  test('should correctly debug log recovered alerts if canSetRecoveryContext is true', () => {
    const recoveredAlerts = new Map();
    const recoveredAlert8 = new Alert<{}, {}, DefaultActionGroupId>('8');
    recoveredAlert8.setContext({ value: 'hey' });
    recoveredAlerts.set('8', recoveredAlert8);
    recoveredAlerts.set('9', new Alert<{}, {}, DefaultActionGroupId>('9'));

    logAlerts({
      logger,
      alertingEventLogger,
      newAlerts: new Map(),
      activeAlerts: new Map(),
      recoveredAlerts,
      ruleLogPrefix: `test-rule-type-id:123: 'test rule'`,
      ruleRunMetricsStore,
      canSetRecoveryContext: true,
      shouldPersistAlerts: true,
    });

    expect(logger.debug).toHaveBeenCalledTimes(2);
    expect(logger.debug).toHaveBeenNthCalledWith(
      1,
      `rule test-rule-type-id:123: 'test rule' has 2 recovered alerts: [\"8\",\"9\"]`
    );
    expect(logger.debug).toHaveBeenNthCalledWith(
      2,
      `rule test-rule-type-id:123: 'test rule' has no recovery context specified for recovered alert 9`
    );
  });

  test('should not debug log if no alerts', () => {
    logAlerts({
      logger,
      alertingEventLogger,
      newAlerts: new Map(),
      activeAlerts: new Map(),
      recoveredAlerts: new Map(),
      ruleLogPrefix: `test-rule-type-id:123: 'test rule'`,
      ruleRunMetricsStore,
      canSetRecoveryContext: true,
      shouldPersistAlerts: true,
    });

    expect(logger.debug).not.toHaveBeenCalled();
  });

  test('should correctly set values in ruleRunMetricsStore and call alertingEventLogger.logAlert if shouldPersistAlerts is true', () => {
    jest.clearAllMocks();

    const newAlerts = new Map();
    newAlerts.set('4', new Alert<{}, {}, DefaultActionGroupId>('4'));
    const activeAlerts = new Map();
    activeAlerts.set(
      '1',
      new Alert<{}, {}, DefaultActionGroupId>('1', { meta: { uuid: 'uuid-1' } })
    );
    activeAlerts.set(
      '2',
      new Alert<{}, {}, DefaultActionGroupId>('2', { meta: { uuid: 'uuid-2' } })
    );
    activeAlerts.set('4', new Alert<{}, {}, DefaultActionGroupId>('4'));
    const recoveredAlerts = new Map();
    recoveredAlerts.set(
      '7',
      new Alert<{}, {}, DefaultActionGroupId>('7', { meta: { uuid: 'uuid-7' } })
    );
    recoveredAlerts.set(
      '8',
      new Alert<{}, {}, DefaultActionGroupId>('8', { meta: { uuid: 'uuid-8' } })
    );
    recoveredAlerts.set(
      '9',
      new Alert<{}, {}, DefaultActionGroupId>('9', { meta: { uuid: 'uuid-9' } })
    );
    recoveredAlerts.set(
      '10',
      new Alert<{}, {}, DefaultActionGroupId>('10', { meta: { uuid: 'uuid-10' } })
    );

    logAlerts({
      logger,
      alertingEventLogger,
      newAlerts,
      activeAlerts,
      recoveredAlerts,
      ruleLogPrefix: `test-rule-type-id:123: 'test rule'`,
      ruleRunMetricsStore,
      canSetRecoveryContext: false,
      shouldPersistAlerts: true,
    });

    expect(ruleRunMetricsStore.getNumberOfNewAlerts()).toEqual(1);
    expect(ruleRunMetricsStore.getNumberOfActiveAlerts()).toEqual(3);
    expect(ruleRunMetricsStore.getNumberOfRecoveredAlerts()).toEqual(4);

    expect(alertingEventLogger.logAlert).toHaveBeenCalledTimes(8);

    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(1, {
      action: 'recovered-instance',
      id: '7',
      message: "test-rule-type-id:123: 'test rule' alert '7' has recovered",
      state: {},
      flapping: false,
      uuid: 'uuid-7',
    });
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(2, {
      action: 'recovered-instance',
      id: '8',
      message: "test-rule-type-id:123: 'test rule' alert '8' has recovered",
      state: {},
      flapping: false,
      uuid: 'uuid-8',
    });
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(3, {
      action: 'recovered-instance',
      id: '9',
      message: "test-rule-type-id:123: 'test rule' alert '9' has recovered",
      state: {},
      flapping: false,
      uuid: 'uuid-9',
    });
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(4, {
      action: 'recovered-instance',
      id: '10',
      message: "test-rule-type-id:123: 'test rule' alert '10' has recovered",
      state: {},
      flapping: false,
      uuid: 'uuid-10',
    });
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(5, {
      action: 'new-instance',
      id: '4',
      message: "test-rule-type-id:123: 'test rule' created new alert: '4'",
      state: {},
      flapping: false,
      uuid: expect.any(String),
    });
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(6, {
      action: 'active-instance',
      id: '1',
      message: "test-rule-type-id:123: 'test rule' active alert: '1' in actionGroup: 'undefined'",
      state: {},
      flapping: false,
      uuid: 'uuid-1',
    });
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(7, {
      action: 'active-instance',
      id: '2',
      message: "test-rule-type-id:123: 'test rule' active alert: '2' in actionGroup: 'undefined'",
      state: {},
      flapping: false,
      uuid: 'uuid-2',
    });
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(8, {
      action: 'active-instance',
      id: '4',
      message: "test-rule-type-id:123: 'test rule' active alert: '4' in actionGroup: 'undefined'",
      state: {},
      flapping: false,
      uuid: expect.any(String),
    });

    // check the two calls for alert 4 used the same UUID
    const actualUuid1 = alertingEventLogger.logAlert.mock.calls[4][0].uuid;
    const actualUuid2 = alertingEventLogger.logAlert.mock.calls[7][0].uuid;
    expect(actualUuid1).toEqual(actualUuid2);
    expect(actualUuid1).toMatch(/^uuid-module-v4-called-\d+$/);
  });

  test('should not call alertingEventLogger.logAlert or update ruleRunMetricsStore if shouldPersistAlerts is false', () => {
    const newAlerts = new Map();
    newAlerts.set('4', new Alert<{}, {}, DefaultActionGroupId>('4'));

    const activeAlerts = new Map();
    activeAlerts.set('1', new Alert<{}, {}, DefaultActionGroupId>('1'));
    activeAlerts.set('2', new Alert<{}, {}, DefaultActionGroupId>('2'));
    activeAlerts.set('4', new Alert<{}, {}, DefaultActionGroupId>('4'));

    const recoveredAlerts = new Map();
    recoveredAlerts.set('7', new Alert<{}, {}, DefaultActionGroupId>('7'));
    recoveredAlerts.set('8', new Alert<{}, {}, DefaultActionGroupId>('8'));
    recoveredAlerts.set('9', new Alert<{}, {}, DefaultActionGroupId>('9'));
    recoveredAlerts.set('10', new Alert<{}, {}, DefaultActionGroupId>('10'));

    logAlerts({
      logger,
      alertingEventLogger,
      newAlerts,
      activeAlerts,
      recoveredAlerts,
      ruleLogPrefix: `test-rule-type-id:123: 'test rule'`,
      ruleRunMetricsStore,
      canSetRecoveryContext: false,
      shouldPersistAlerts: false,
    });

    expect(ruleRunMetricsStore.getNumberOfNewAlerts()).toEqual(0);
    expect(ruleRunMetricsStore.getNumberOfActiveAlerts()).toEqual(0);
    expect(ruleRunMetricsStore.getNumberOfRecoveredAlerts()).toEqual(0);

    expect(alertingEventLogger.logAlert).not.toHaveBeenCalled();
  });

  test('should correctly set flapping values', () => {
    const newAlerts = new Map();
    newAlerts.set('4', new Alert<{}, {}, DefaultActionGroupId>('4'));

    const activeAlerts = new Map();
    activeAlerts.set(
      '1',
      new Alert<{}, {}, DefaultActionGroupId>('1', { meta: { flapping: true } })
    );
    activeAlerts.set('2', new Alert<{}, {}, DefaultActionGroupId>('2'));
    activeAlerts.set('4', new Alert<{}, {}, DefaultActionGroupId>('4'));

    const recoveredAlerts = new Map();
    recoveredAlerts.set('7', new Alert<{}, {}, DefaultActionGroupId>('7'));
    recoveredAlerts.set(
      '8',
      new Alert<{}, {}, DefaultActionGroupId>('8', { meta: { flapping: true } })
    );
    recoveredAlerts.set('9', new Alert<{}, {}, DefaultActionGroupId>('9'));
    recoveredAlerts.set('10', new Alert<{}, {}, DefaultActionGroupId>('10'));

    logAlerts({
      logger,
      alertingEventLogger,
      newAlerts,
      activeAlerts,
      recoveredAlerts,
      ruleLogPrefix: `test-rule-type-id:123: 'test rule'`,
      ruleRunMetricsStore,
      canSetRecoveryContext: false,
      shouldPersistAlerts: true,
    });

    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(1, {
      action: 'recovered-instance',
      id: '7',
      message: "test-rule-type-id:123: 'test rule' alert '7' has recovered",
      state: {},
      flapping: false,
      group: undefined,
      uuid: expect.any(String),
    });
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(2, {
      action: 'recovered-instance',
      id: '8',
      message: "test-rule-type-id:123: 'test rule' alert '8' has recovered",
      state: {},
      flapping: true,
      group: undefined,
      uuid: expect.any(String),
    });
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(3, {
      action: 'recovered-instance',
      id: '9',
      message: "test-rule-type-id:123: 'test rule' alert '9' has recovered",
      state: {},
      flapping: false,
      group: undefined,
      uuid: expect.any(String),
    });
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(4, {
      action: 'recovered-instance',
      id: '10',
      message: "test-rule-type-id:123: 'test rule' alert '10' has recovered",
      state: {},
      flapping: false,
      group: undefined,
      uuid: expect.any(String),
    });
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(5, {
      action: 'new-instance',
      id: '4',
      message: "test-rule-type-id:123: 'test rule' created new alert: '4'",
      state: {},
      flapping: false,
      group: undefined,
      uuid: expect.any(String),
    });
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(6, {
      action: 'active-instance',
      id: '1',
      message: "test-rule-type-id:123: 'test rule' active alert: '1' in actionGroup: 'undefined'",
      state: {},
      flapping: true,
      group: undefined,
      uuid: expect.any(String),
    });
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(7, {
      action: 'active-instance',
      id: '2',
      message: "test-rule-type-id:123: 'test rule' active alert: '2' in actionGroup: 'undefined'",
      state: {},
      flapping: false,
      group: undefined,
      uuid: expect.any(String),
    });
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(8, {
      action: 'active-instance',
      id: '4',
      message: "test-rule-type-id:123: 'test rule' active alert: '4' in actionGroup: 'undefined'",
      state: {},
      flapping: false,
      group: undefined,
      uuid: expect.any(String),
    });
  });

  test('should correctly set maintenance window in ruleRunMetricsStore and call alertingEventLogger.logAlert', () => {
    const newAlerts = new Map();
    newAlerts.set('4', new Alert<{}, {}, DefaultActionGroupId>('4'));

    const activeAlerts = new Map();
    activeAlerts.set(
      '1',
      new Alert<{}, {}, DefaultActionGroupId>('1', {
        meta: { maintenanceWindowIds: ['window-id-1'] },
      })
    );
    activeAlerts.set('4', new Alert<{}, {}, DefaultActionGroupId>('4'));

    const recoveredAlerts = new Map();
    recoveredAlerts.set('7', new Alert<{}, {}, DefaultActionGroupId>('7'));
    recoveredAlerts.set(
      '8',
      new Alert<{}, {}, DefaultActionGroupId>('8', {
        meta: { maintenanceWindowIds: ['window-id-8'] },
      })
    );

    jest.clearAllMocks();
    logAlerts({
      logger,
      alertingEventLogger,
      newAlerts,
      activeAlerts,
      recoveredAlerts,
      ruleLogPrefix: `test-rule-type-id:123: 'test rule'`,
      ruleRunMetricsStore,
      canSetRecoveryContext: false,
      shouldPersistAlerts: true,
    });

    expect(ruleRunMetricsStore.getNumberOfNewAlerts()).toEqual(1);
    expect(ruleRunMetricsStore.getNumberOfActiveAlerts()).toEqual(2);
    expect(ruleRunMetricsStore.getNumberOfRecoveredAlerts()).toEqual(2);

    expect(alertingEventLogger.logAlert).toHaveBeenCalledTimes(5);

    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(1, {
      action: 'recovered-instance',
      id: '7',
      message: "test-rule-type-id:123: 'test rule' alert '7' has recovered",
      state: {},
      flapping: false,
      group: undefined,
      uuid: expect.any(String),
    });
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(2, {
      action: 'recovered-instance',
      id: '8',
      message: "test-rule-type-id:123: 'test rule' alert '8' has recovered",
      state: {},
      flapping: false,
      group: undefined,
      uuid: expect.any(String),
      maintenanceWindowIds: ['window-id-8'],
    });
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(3, {
      action: 'new-instance',
      id: '4',
      message: "test-rule-type-id:123: 'test rule' created new alert: '4'",
      state: {},
      flapping: false,
      group: undefined,
      uuid: expect.any(String),
    });
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(4, {
      action: 'active-instance',
      id: '1',
      message: "test-rule-type-id:123: 'test rule' active alert: '1' in actionGroup: 'undefined'",
      state: {},
      flapping: false,
      group: undefined,
      uuid: expect.any(String),
      maintenanceWindowIds: ['window-id-1'],
    });
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(5, {
      action: 'active-instance',
      id: '4',
      message: "test-rule-type-id:123: 'test rule' active alert: '4' in actionGroup: 'undefined'",
      state: {},
      flapping: false,
      group: undefined,
      uuid: expect.any(String),
    });
  });
});
