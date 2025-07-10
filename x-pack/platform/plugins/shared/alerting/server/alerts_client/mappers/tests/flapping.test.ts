/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Alert } from '../../../alert/alert';
import { applyFlapping } from '../3_flapping';
import { alertToJson, alertsClientContext } from './test_utils';
import { DEFAULT_FLAPPING_SETTINGS } from '../../../types';
import { AlertCategory, type AlertsResult } from '../../alert_mapper';
import { cloneDeep } from 'lodash';
import type { AlertInstanceState as S, AlertInstanceContext as C } from '../../../types';

describe('applyFlapping', () => {
  const flapping = new Array(16).fill(false).concat([true, true, true, true]);
  const notFlapping = new Array(20).fill(false);

  let ongoingAlert1: Alert;
  let ongoingAlert2: Alert;
  let ongoingAlert3: Alert;
  let newAlert4: Alert;
  let recoveredAlert5: Alert;
  let recoveredAlert6: Alert;
  let recoveredAlert7: Alert;
  let recoveredAlert8: Alert;
  let previouslyRecoveredAlert9: Alert;

  let previousActiveAlerts: Map<string, Alert>;
  let previousRecoveredAlerts: Map<string, Alert>;
  let alerts: AlertsResult<S, C, string, string> = [];

  beforeEach(() => {
    ongoingAlert1 = new Alert('1', {
      meta: { uuid: '6f3a63fa-7291-4074-8f9f-9eb0d696b8fc', flappingHistory: flapping },
    });
    ongoingAlert2 = new Alert('2', {
      meta: { uuid: '8df3816a-e4bf-4fd3-b602-7a96306f356a', flappingHistory: [false, false] },
    });
    ongoingAlert3 = new Alert('3', {
      meta: {
        uuid: '902e99bb-d9d9-4dc3-87c4-4778c2d6dcb8',
        flapping: true,
        flappingHistory: flapping,
      },
    });
    newAlert4 = new Alert('4', {
      meta: {
        uuid: 'c8975606-c1c5-4273-a982-f93adf228db1',
        flapping: true,
        flappingHistory: [false, false],
      },
    });
    recoveredAlert5 = new Alert('5', {
      meta: {
        uuid: '07a69162-df20-443a-914d-0983e204448b',
        flappingHistory: [true, true, true, true],
      },
    });
    recoveredAlert6 = new Alert('6', {
      meta: { uuid: '8dd7e6cb-37f1-48eb-905c-001b095b6488', flappingHistory: notFlapping },
    });
    recoveredAlert7 = new Alert('7', {
      meta: {
        uuid: '84c2cb08-7d56-432e-b8da-78ff2cc8b59a',
        flapping: true,
        flappingHistory: [true, true],
      },
    });
    recoveredAlert8 = new Alert('8', {
      meta: {
        uuid: '327958c3-db99-4d54-8ab2-a767644f049f',
        flapping: true,
        flappingHistory: notFlapping,
      },
    });
    previouslyRecoveredAlert9 = new Alert('9', {
      meta: { uuid: '2652dd97-bd4f-4011-bee5-43f653362806' },
    });

    previousActiveAlerts = new Map();

    previousRecoveredAlerts = new Map();
    previousRecoveredAlerts.set(previouslyRecoveredAlert9.getId(), previouslyRecoveredAlert9);

    alerts = [
      { alert: ongoingAlert1, category: AlertCategory.Ongoing },
      { alert: ongoingAlert2, category: AlertCategory.Ongoing },
      { alert: ongoingAlert3, category: AlertCategory.Ongoing },
      { alert: newAlert4, category: AlertCategory.New },
      { alert: recoveredAlert5, category: AlertCategory.Recovered },
      { alert: recoveredAlert6, category: AlertCategory.Recovered },
      { alert: recoveredAlert7, category: AlertCategory.Recovered },
      { alert: recoveredAlert8, category: AlertCategory.Recovered },
    ];
  });

  test('should correctly set flapping property to false on new, ongoing and recovered alerts when flapping is disabled', async () => {
    const input = {
      // this function mutates the input alerts so clone them so we can compare the output
      alerts: cloneDeep(alerts),
      context: {
        flappingSettings: { enabled: false, threshold: 4, historySize: 20 },
        alertsClientContext,
        previousActiveAlerts,
        previousRecoveredAlerts,
      },
    };

    // @ts-ignore incomplete context mock
    const result = await applyFlapping(input);

    // sanity check to make sure inputs are not mutated, otherwise the comparisons will be meaningless
    expect(ongoingAlert3.getFlapping()).toEqual(true);

    expect(result.length).toEqual(8);
    expect(result[0].category).toEqual(AlertCategory.Ongoing);
    expect(alertToJson(result[0].alert)).toEqual({
      ...alertToJson(ongoingAlert1),
      flapping: false,
    });

    expect(result[1].category).toEqual(AlertCategory.Ongoing);
    expect(alertToJson(result[1].alert)).toEqual({
      ...alertToJson(ongoingAlert2),
      flapping: false,
    });

    expect(result[2].category).toEqual(AlertCategory.Ongoing);
    expect(alertToJson(result[2].alert)).toEqual({
      ...alertToJson(ongoingAlert3),
      flapping: false,
    });

    expect(result[3].category).toEqual(AlertCategory.New);
    expect(alertToJson(result[3].alert)).toEqual({ ...alertToJson(newAlert4), flapping: false });

    expect(result[4].category).toEqual(AlertCategory.Recovered);
    expect(alertToJson(result[4].alert)).toEqual({
      ...alertToJson(recoveredAlert5),
      flapping: false,
    });

    expect(result[5].category).toEqual(AlertCategory.Recovered);
    expect(alertToJson(result[5].alert)).toEqual({
      ...alertToJson(recoveredAlert6),
      flapping: false,
    });

    expect(result[6].category).toEqual(AlertCategory.Recovered);
    expect(alertToJson(result[6].alert)).toEqual({
      ...alertToJson(recoveredAlert7),
      flapping: false,
    });

    expect(result[7].category).toEqual(AlertCategory.Recovered);
    expect(alertToJson(result[7].alert)).toEqual({
      ...alertToJson(recoveredAlert8),
      flapping: false,
    });
  });

  test('should correctly set flapping property on new, ongoing and recovered alerts', async () => {
    const result = await applyFlapping({
      // this function mutates the input alerts so clone them so we can compare the output
      alerts: cloneDeep(alerts),
      // @ts-ignore incomplete context mock
      context: {
        alertsClientContext,
        previousActiveAlerts,
        previousRecoveredAlerts,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
      },
    });

    // sanity check to make sure inputs are not mutated, otherwise the comparisons will be meaningless
    expect(ongoingAlert3.getFlapping()).toEqual(true);

    expect(result.length).toEqual(8);
    expect(result[0].category).toEqual(AlertCategory.Ongoing);
    expect(alertToJson(result[0].alert).flapping).toEqual(true);

    expect(result[1].category).toEqual(AlertCategory.Ongoing);
    expect(alertToJson(result[1].alert).flapping).toEqual(false);

    expect(result[2].category).toEqual(AlertCategory.Ongoing);
    expect(alertToJson(result[2].alert).flapping).toEqual(true);

    expect(result[3].category).toEqual(AlertCategory.New);
    expect(alertToJson(result[3].alert).flapping).toEqual(true);

    expect(result[4].category).toEqual(AlertCategory.Recovered);
    expect(alertToJson(result[4].alert).flapping).toEqual(true);

    expect(result[5].category).toEqual(AlertCategory.Recovered);
    expect(alertToJson(result[5].alert).flapping).toEqual(false);

    expect(result[6].category).toEqual(AlertCategory.Recovered);
    expect(alertToJson(result[6].alert).flapping).toEqual(true);

    expect(result[7].category).toEqual(AlertCategory.Recovered);
    expect(alertToJson(result[7].alert).flapping).toEqual(false);
  });
});
