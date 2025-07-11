/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Alert } from '../../alert/alert';
import { applyMaintenanceWindows } from './maintenance_window';
import { getMockMaintenanceWindow } from '../../data/maintenance_window/test_helpers';
import { MaintenanceWindowStatus } from '../../../common';
import {
  alertToJson,
  alertingEventLogger,
  alertsClientContext,
  fakeRequest,
  logger,
  maintenanceWindowsService,
  ruleType,
} from './test_utils';
import type { AlertInstanceState as S, AlertInstanceContext as C } from '../../types';
import { cloneDeep } from 'lodash';
import { AlertCategory, type AlertsResult } from './types';

describe('applyMaintenanceWindows', () => {
  let ongoingAlert1: Alert;
  let ongoingAlert2: Alert;
  let ongoingAlert3: Alert;
  let ongoingAlert4: Alert;
  let ongoingAlert5: Alert;
  let newAlert6: Alert;
  let newAlert7: Alert;
  let recoveredAlert8: Alert;
  let previouslyRecoveredAlert9: Alert;

  let previousActiveAlerts: Map<string, Alert>;
  let previousRecoveredAlerts: Map<string, Alert>;

  let alerts: AlertsResult<S, C, string> = [];

  beforeAll(() => {
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
  });

  beforeEach(() => {
    ongoingAlert1 = new Alert('1', {
      state: { start: '1969-12-31T07:34:00.000Z', duration: 59160000 },
      meta: {
        uuid: '6f3a63fa-7291-4074-8f9f-9eb0d696b8fc',
        maintenanceWindowIds: ['old-id1', 'test-id2'],
      },
    });
    ongoingAlert2 = new Alert('2', {
      state: { start: '1969-12-30T03:28:00.000Z', duration: 160320000 },
      meta: {
        uuid: '8df3816a-e4bf-4fd3-b602-7a96306f356a',
        maintenanceWindowIds: ['test-id1', 'test-id2'],
      },
    });
    ongoingAlert3 = new Alert('3', {
      state: { start: '1969-12-31T09:12:03.000Z', duration: 53277000 },
      meta: {
        uuid: '902e99bb-d9d9-4dc3-87c4-4778c2d6dcb8',
        maintenanceWindowIds: ['test-id1', 'old-id2'],
      },
    });
    ongoingAlert4 = new Alert('4', {
      state: { start: '1969-12-31T09:12:03.000Z', duration: 53277000 },
      meta: {
        uuid: 'c8736506-c4a9-4ff2-a3cd-1596643c27ad',
        maintenanceWindowIds: ['old-id1', 'old-id2'],
      },
    });
    ongoingAlert5 = new Alert('5', {
      state: { start: '1969-12-30T09:23:10.000Z', duration: 139010000 },
      meta: { uuid: 'd64bbe6f-9722-40c4-ba85-f6fe95a8f964', maintenanceWindowIds: [] },
    });
    newAlert6 = new Alert('6', {
      state: { start: '1970-01-01T00:00:00.000Z', duration: '0' },
      meta: { uuid: 'c8975606-c1c5-4273-a982-f93adf228db1' },
    });
    newAlert7 = new Alert('7', {
      state: { start: '1970-01-01T00:00:00.000Z', duration: '0' },
      meta: { uuid: '22f77e33-b712-4a88-b009-4a518a7811e1' },
    });
    recoveredAlert8 = new Alert('8', {
      state: {
        start: '1969-12-31T09:12:03.000Z',
        duration: 53277000,
        end: '1970-01-01T00:00:00.000Z',
      },
      meta: {
        uuid: '07a69162-df20-443a-914d-0983e204448b',
        maintenanceWindowIds: ['old-id1', 'test-id2'],
      },
    });
    previouslyRecoveredAlert9 = new Alert('9', {
      state: {
        start: '1969-12-30T06:18:54.412Z',
        duration: 150065588,
        end: '1970-01-01T00:00:00.000Z',
      },
      meta: { uuid: '2652dd97-bd4f-4011-bee5-43f653362806' },
    });

    previousActiveAlerts = new Map();

    previousRecoveredAlerts = new Map();
    previousRecoveredAlerts.set(previouslyRecoveredAlert9.getId(), previouslyRecoveredAlert9);

    alerts = [
      { alert: ongoingAlert1, category: AlertCategory.Ongoing },
      { alert: ongoingAlert2, category: AlertCategory.Ongoing },
      { alert: ongoingAlert3, category: AlertCategory.Ongoing },
      { alert: ongoingAlert4, category: AlertCategory.Ongoing },
      { alert: ongoingAlert5, category: AlertCategory.Ongoing },
      { alert: newAlert6, category: AlertCategory.New },
      { alert: newAlert7, category: AlertCategory.New },
      { alert: recoveredAlert8, category: AlertCategory.Recovered },
    ];
  });

  test('returns all alerts as-is when no maintenance window service provided', async () => {
    const input = {
      // this function mutates the input alerts so clone them so we can compare the output
      alerts: cloneDeep(alerts),
      context: {
        alertsClientContext: {
          alertingEventLogger,
          logger,
          request: fakeRequest,
          spaceId: 'space1',
          ruleType,
        },
        previousActiveAlerts,
        previousRecoveredAlerts,
      },
    };

    // @ts-ignore incomplete context mock
    const result = await applyMaintenanceWindows(input);

    expect(maintenanceWindowsService.getMaintenanceWindows).not.toHaveBeenCalled();
    expect(result.length).toEqual(8);
    expect(result[0].category).toEqual(AlertCategory.Ongoing);
    expect(alertToJson(result[0].alert)).toEqual(alertToJson(ongoingAlert1));

    expect(result[1].category).toEqual(AlertCategory.Ongoing);
    expect(alertToJson(result[1].alert)).toEqual(alertToJson(ongoingAlert2));

    expect(result[2].category).toEqual(AlertCategory.Ongoing);
    expect(alertToJson(result[2].alert)).toEqual(alertToJson(ongoingAlert3));

    expect(result[3].category).toEqual(AlertCategory.Ongoing);
    expect(alertToJson(result[3].alert)).toEqual(alertToJson(ongoingAlert4));

    expect(result[4].category).toEqual(AlertCategory.Ongoing);
    expect(alertToJson(result[4].alert)).toEqual(alertToJson(ongoingAlert5));

    expect(result[5].category).toEqual(AlertCategory.New);
    expect(alertToJson(result[5].alert)).toEqual(alertToJson(newAlert6));

    expect(result[6].category).toEqual(AlertCategory.New);
    expect(alertToJson(result[6].alert)).toEqual(alertToJson(newAlert7));

    expect(result[7].category).toEqual(AlertCategory.Recovered);
    expect(alertToJson(result[7].alert)).toEqual(alertToJson(recoveredAlert8));
  });

  test('returns all alerts as-is when no new, ongoing or recovered alerts', async () => {
    const input = {
      alerts: [],
      context: { alertsClientContext, previousActiveAlerts, previousRecoveredAlerts },
    };

    // @ts-ignore incomplete context mock
    const result = await applyMaintenanceWindows(input);

    expect(maintenanceWindowsService.getMaintenanceWindows).not.toHaveBeenCalled();
    expect(result.length).toEqual(0);
  });

  test('loads active maintenance windows and adds them to new alerts; removes outdated maintenance windows from ongoing and recovered alerts', async () => {
    const result = await applyMaintenanceWindows({
      // this function mutates the input alerts so clone them so we can compare the output
      alerts: cloneDeep(alerts),
      // @ts-ignore incomplete context mock
      context: { alertsClientContext, previousActiveAlerts, previousRecoveredAlerts },
    });

    expect(maintenanceWindowsService.getMaintenanceWindows).toHaveBeenCalledWith({
      eventLogger: alertingEventLogger,
      request: fakeRequest,
      ruleTypeCategory: ruleType.category,
      spaceId: 'space1',
    });

    // sanity check to make sure inputs are not mutated, otherwise the comparisons will be meaningless
    expect(ongoingAlert1.getMaintenanceWindowIds()).toEqual(['old-id1', 'test-id2']);

    expect(result.length).toEqual(8);
    expect(result[0].category).toEqual(AlertCategory.Ongoing);
    expect(alertToJson(result[0].alert)).toEqual({
      ...alertToJson(ongoingAlert1),
      maintenanceWindowIds: ['test-id2'],
    });

    expect(result[1].category).toEqual(AlertCategory.Ongoing);
    expect(alertToJson(result[1].alert)).toEqual(alertToJson(ongoingAlert2));

    expect(result[2].category).toEqual(AlertCategory.Ongoing);
    expect(alertToJson(result[2].alert)).toEqual({
      ...alertToJson(ongoingAlert3),
      maintenanceWindowIds: ['test-id1'],
    });

    expect(result[3].category).toEqual(AlertCategory.Ongoing);
    expect(alertToJson(result[3].alert)).toEqual({
      ...alertToJson(ongoingAlert4),
      maintenanceWindowIds: [],
    });

    expect(result[4].category).toEqual(AlertCategory.Ongoing);
    expect(alertToJson(result[4].alert)).toEqual(alertToJson(ongoingAlert5));

    expect(result[5].category).toEqual(AlertCategory.New);
    expect(alertToJson(result[5].alert)).toEqual({
      ...alertToJson(newAlert6),
      maintenanceWindowIds: ['test-id1', 'test-id2'],
    });

    expect(result[6].category).toEqual(AlertCategory.New);
    expect(alertToJson(result[6].alert)).toEqual({
      ...alertToJson(newAlert7),
      maintenanceWindowIds: ['test-id1', 'test-id2'],
    });

    expect(result[7].category).toEqual(AlertCategory.Recovered);
    expect(alertToJson(result[7].alert)).toEqual({
      ...alertToJson(recoveredAlert8),
      maintenanceWindowIds: ['test-id2'],
    });
  });
});
