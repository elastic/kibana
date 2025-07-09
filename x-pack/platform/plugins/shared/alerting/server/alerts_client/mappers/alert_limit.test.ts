/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { schema } from '@kbn/config-schema';
import type { AlertInstanceContext, AlertInstanceState } from '@kbn/alerting-state-types';
import { Alert } from '../../alert/alert';
import { mapAlertLimit } from './1_alert_limit';
import { AlertCategory } from '../types';
import { alertingEventLoggerMock } from '../../lib/alerting_event_logger/alerting_event_logger.mock';
import type { KibanaRequest } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { UntypedNormalizedRuleType } from '../../rule_type_registry';
import { RecoveredActionGroup } from '@kbn/alerting-types';
import { maintenanceWindowsServiceMock } from '../../task_runner/maintenance_windows/maintenance_windows_service.mock';
import { cloneDeep } from 'lodash';

const logger = loggingSystemMock.createLogger();
const alertingEventLogger = alertingEventLoggerMock.create();
const maintenanceWindowsService = maintenanceWindowsServiceMock.create();

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
  solution: 'stack',
  cancelAlertsOnRuleTimeout: true,
  ruleTaskTimeout: '5m',
  validate: {
    params: schema.any(),
  },
  validLegacyConsumers: [],
};

const alertsClientContext = {
  alertingEventLogger,
  logger,
  request: fakeRequest,
  spaceId: 'space1',
  ruleType,
  maintenanceWindowsService,
};

describe('mapAlertLimit', () => {
  let clock: sinon.SinonFakeTimers;
  let startedAt: string;
  let existingAlert1: Alert<AlertInstanceState, AlertInstanceContext>;
  let existingAlert2: Alert<AlertInstanceState, AlertInstanceContext>;
  let existingAlert3: Alert<AlertInstanceState, AlertInstanceContext>;
  let existingAlert4: Alert<AlertInstanceState, AlertInstanceContext>;
  let existingAlert5: Alert<AlertInstanceState, AlertInstanceContext>;
  let ongoingAlert1: Alert<AlertInstanceState, AlertInstanceContext>;
  let ongoingAlert2: Alert<AlertInstanceState, AlertInstanceContext>;
  let ongoingAlert3: Alert<AlertInstanceState, AlertInstanceContext>;
  let ongoingAlert4: Alert<AlertInstanceState, AlertInstanceContext>;
  let ongoingAlert5: Alert<AlertInstanceState, AlertInstanceContext>;
  let newAlert6: Alert<AlertInstanceState, AlertInstanceContext>;
  let newAlert7: Alert<AlertInstanceState, AlertInstanceContext>;
  let recoveredAlert8: Alert<AlertInstanceState, AlertInstanceContext>;
  let previouslyRecoveredAlert9: Alert<AlertInstanceState, AlertInstanceContext>;

  beforeAll(() => {
    clock = sinon.useFakeTimers();
    startedAt = new Date().toISOString();
  });

  beforeEach(() => {
    clock.reset();

    existingAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('1', {
      state: { start: '1969-12-31T07:34:00.000Z', duration: 54243 },
    });
    existingAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('2', {
      state: { start: '1969-12-30T03:28:00.000Z', duration: 572237 },
    });
    existingAlert3 = new Alert<AlertInstanceState, AlertInstanceContext>('3', {
      state: { start: '1969-12-31T09:12:03.000Z', duration: 689753 },
    });
    existingAlert4 = new Alert<AlertInstanceState, AlertInstanceContext>('4', {
      state: { start: '1969-12-31T09:12:03.000Z', duration: 34546 },
    });
    existingAlert5 = new Alert<AlertInstanceState, AlertInstanceContext>('5', {
      state: { start: '1969-12-30T09:23:10.000Z', duration: 6867 },
    });
    ongoingAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('1', {
      state: { start: '1969-12-31T07:34:00.000Z', duration: 59160000 },
    });
    ongoingAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('2', {
      state: { start: '1969-12-30T03:28:00.000Z', duration: 160320000 },
    });
    ongoingAlert3 = new Alert<AlertInstanceState, AlertInstanceContext>('3', {
      state: { start: '1969-12-31T09:12:03.000Z', duration: 53277000 },
    });
    ongoingAlert4 = new Alert<AlertInstanceState, AlertInstanceContext>('4', {
      state: { start: '1969-12-31T09:12:03.000Z', duration: 53277000 },
    });
    ongoingAlert5 = new Alert<AlertInstanceState, AlertInstanceContext>('5', {
      state: { start: '1969-12-30T09:23:10.000Z', duration: 139010000 },
    });
    newAlert6 = new Alert<AlertInstanceState, AlertInstanceContext>('6', {
      state: { start: '1970-01-01T00:00:00.000Z', duration: '0' },
    });
    newAlert7 = new Alert<AlertInstanceState, AlertInstanceContext>('7', {
      state: { start: '1970-01-01T00:00:00.000Z', duration: '0' },
    });
    recoveredAlert8 = new Alert<AlertInstanceState, AlertInstanceContext>('8', {
      state: {
        start: '1969-12-31T09:12:03.000Z',
        duration: 53277000,
        end: '1970-01-01T00:00:00.000Z',
      },
    });
    previouslyRecoveredAlert9 = new Alert<AlertInstanceState, AlertInstanceContext>('9', {
      state: {
        start: '1969-12-30T06:18:54.412Z',
        duration: 150065588,
        end: '1970-01-01T00:00:00.000Z',
      },
    });
  });

  afterAll(() => clock.restore());

  test('returns all alerts as-is except existing ones when alert limit has not been reached', async () => {
    const result = await mapAlertLimit({
      alerts: [
        { alert: existingAlert1, category: AlertCategory.Existing },
        { alert: existingAlert2, category: AlertCategory.Existing },
        { alert: existingAlert3, category: AlertCategory.Existing },
        { alert: existingAlert4, category: AlertCategory.Existing },
        { alert: existingAlert5, category: AlertCategory.Existing },
        { alert: ongoingAlert1, category: AlertCategory.Ongoing },
        { alert: ongoingAlert2, category: AlertCategory.Ongoing },
        { alert: ongoingAlert3, category: AlertCategory.Ongoing },
        { alert: ongoingAlert4, category: AlertCategory.Ongoing },
        { alert: ongoingAlert5, category: AlertCategory.Ongoing },
        { alert: newAlert6, category: AlertCategory.New },
        { alert: newAlert7, category: AlertCategory.New },
        { alert: recoveredAlert8, category: AlertCategory.Recovered },
        { alert: previouslyRecoveredAlert9, category: AlertCategory.PreviouslyRecovered },
      ],
      // @ts-ignore incomplete context mock
      context: {
        alertsClientContext,
        hasReachedAlertLimit: false,
        maxAlerts: 7,
        startedAt,
      },
    });

    expect(result).toEqual([
      { alert: ongoingAlert1, category: AlertCategory.Ongoing },
      { alert: ongoingAlert2, category: AlertCategory.Ongoing },
      { alert: ongoingAlert3, category: AlertCategory.Ongoing },
      { alert: ongoingAlert4, category: AlertCategory.Ongoing },
      { alert: ongoingAlert5, category: AlertCategory.Ongoing },
      { alert: newAlert6, category: AlertCategory.New },
      { alert: newAlert7, category: AlertCategory.New },
      { alert: recoveredAlert8, category: AlertCategory.Recovered },
      { alert: previouslyRecoveredAlert9, category: AlertCategory.PreviouslyRecovered },
    ]);
  });

  test('returns existing alerts as ongoing when alert limit has been reached and updates duration', async () => {
    const result = await mapAlertLimit({
      alerts: [
        { alert: cloneDeep(existingAlert1), category: AlertCategory.Existing },
        { alert: cloneDeep(existingAlert2), category: AlertCategory.Existing },
        { alert: cloneDeep(existingAlert3), category: AlertCategory.Existing },
        { alert: cloneDeep(existingAlert4), category: AlertCategory.Existing },
        { alert: cloneDeep(existingAlert5), category: AlertCategory.Existing },
        { alert: cloneDeep(ongoingAlert1), category: AlertCategory.Ongoing },
        { alert: cloneDeep(ongoingAlert2), category: AlertCategory.Ongoing },
        { alert: cloneDeep(ongoingAlert3), category: AlertCategory.Ongoing },
        { alert: cloneDeep(ongoingAlert4), category: AlertCategory.Ongoing },
        { alert: cloneDeep(ongoingAlert5), category: AlertCategory.Ongoing },
        { alert: cloneDeep(newAlert6), category: AlertCategory.New },
        { alert: cloneDeep(newAlert7), category: AlertCategory.New },
        { alert: cloneDeep(recoveredAlert8), category: AlertCategory.Recovered },
        {
          alert: cloneDeep(previouslyRecoveredAlert9),
          category: AlertCategory.PreviouslyRecovered,
        },
      ],
      // @ts-ignore incomplete context mock
      context: {
        alertsClientContext,
        hasReachedAlertLimit: true,
        maxAlerts: 5,
        startedAt,
      },
    });

    expect(result).toEqual([
      // keeps existing alerts and converts them to ongoing with updated duration
      {
        alert: existingAlert1.replaceState({
          ...existingAlert1.getState(),
          duration: '59160000000000',
        }),
        category: AlertCategory.Ongoing,
      },
      {
        alert: existingAlert2.replaceState({
          ...existingAlert2.getState(),
          duration: '160320000000000',
        }),
        category: AlertCategory.Ongoing,
      },
      {
        alert: existingAlert3.replaceState({
          ...existingAlert3.getState(),
          duration: '53277000000000',
        }),
        category: AlertCategory.Ongoing,
      },
      {
        alert: existingAlert4.replaceState({
          ...existingAlert4.getState(),
          duration: '53277000000000',
        }),
        category: AlertCategory.Ongoing,
      },
      {
        alert: existingAlert5.replaceState({
          ...existingAlert5.getState(),
          duration: '139010000000000',
        }),
        category: AlertCategory.Ongoing,
      },

      // filters out recovered alerts

      // passes through previously recovered alerts
      {
        alert: previouslyRecoveredAlert9,
        category: AlertCategory.PreviouslyRecovered,
      },
    ]);
  });

  test('adds new alerts up to the max allowed when alert limit has been reached and updates duration', async () => {
    const result = await mapAlertLimit({
      alerts: [
        { alert: cloneDeep(existingAlert1), category: AlertCategory.Existing },
        { alert: cloneDeep(existingAlert2), category: AlertCategory.Existing },
        { alert: cloneDeep(existingAlert3), category: AlertCategory.Existing },
        { alert: cloneDeep(existingAlert4), category: AlertCategory.Existing },
        { alert: cloneDeep(existingAlert5), category: AlertCategory.Existing },
        { alert: cloneDeep(ongoingAlert1), category: AlertCategory.Ongoing },
        { alert: cloneDeep(ongoingAlert2), category: AlertCategory.Ongoing },
        { alert: cloneDeep(ongoingAlert3), category: AlertCategory.Ongoing },
        { alert: cloneDeep(ongoingAlert4), category: AlertCategory.Ongoing },
        { alert: cloneDeep(ongoingAlert5), category: AlertCategory.Ongoing },
        { alert: cloneDeep(newAlert6), category: AlertCategory.New },
        { alert: cloneDeep(newAlert7), category: AlertCategory.New },
        { alert: cloneDeep(recoveredAlert8), category: AlertCategory.Recovered },
        {
          alert: cloneDeep(previouslyRecoveredAlert9),
          category: AlertCategory.PreviouslyRecovered,
        },
      ],
      // @ts-ignore incomplete context mock
      context: {
        alertsClientContext,
        hasReachedAlertLimit: true,
        maxAlerts: 6,
        startedAt,
      },
    });

    expect(result).toEqual([
      // keeps existing alerts and converts them to ongoing with updated duration
      {
        alert: existingAlert1.replaceState({
          ...existingAlert1.getState(),
          duration: '59160000000000',
        }),
        category: AlertCategory.Ongoing,
      },
      {
        alert: existingAlert2.replaceState({
          ...existingAlert2.getState(),
          duration: '160320000000000',
        }),
        category: AlertCategory.Ongoing,
      },
      {
        alert: existingAlert3.replaceState({
          ...existingAlert3.getState(),
          duration: '53277000000000',
        }),
        category: AlertCategory.Ongoing,
      },
      {
        alert: existingAlert4.replaceState({
          ...existingAlert4.getState(),
          duration: '53277000000000',
        }),
        category: AlertCategory.Ongoing,
      },
      {
        alert: existingAlert5.replaceState({
          ...existingAlert5.getState(),
          duration: '139010000000000',
        }),
        category: AlertCategory.Ongoing,
      },

      // adds new alerts up to allowed capacity
      { alert: newAlert6, category: AlertCategory.New },

      // filters out recovered alerts

      // passes through previously recovered alerts
      {
        alert: previouslyRecoveredAlert9,
        category: AlertCategory.PreviouslyRecovered,
      },
    ]);
  });
});
