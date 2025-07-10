/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Alert } from '../../../alert/alert';
import { applyFlappingHistory } from '../4_flapping_history';
import { alertToJson, alertsClientContext } from './test_utils';
import { DEFAULT_FLAPPING_SETTINGS, DISABLE_FLAPPING_SETTINGS } from '../../../types';
import { AlertCategory } from '../../alert_mapper';
import { cloneDeep } from 'lodash';

describe('applyFlappingHistory', () => {
  let ongoingAlert1: Alert;
  let ongoingAlert2: Alert;
  let newAlert3: Alert;
  let newAlert4: Alert;
  let recoveredAlert5: Alert;
  let recoveredAlert6: Alert;
  let previouslyRecoveredAlert7: Alert;
  let previouslyRecoveredAlert4: Alert;

  let previousActiveAlerts: Map<string, Alert>;
  let previousRecoveredAlerts: Map<string, Alert>;

  beforeEach(() => {
    ongoingAlert1 = new Alert('1', {
      meta: { uuid: '6f3a63fa-7291-4074-8f9f-9eb0d696b8fc', flappingHistory: [true, false, false] },
    });
    ongoingAlert2 = new Alert('2', {
      meta: { uuid: '8df3816a-e4bf-4fd3-b602-7a96306f356a', flappingHistory: [false, false] },
    });
    newAlert3 = new Alert('3', { meta: { uuid: '902e99bb-d9d9-4dc3-87c4-4778c2d6dcb8' } });
    newAlert4 = new Alert('4', { meta: { uuid: 'c8975606-c1c5-4273-a982-f93adf228db1' } });
    recoveredAlert5 = new Alert('5', {
      meta: {
        uuid: '07a69162-df20-443a-914d-0983e204448b',
        flappingHistory: [true, false, true, false, false, false],
      },
    });
    recoveredAlert6 = new Alert('6', {
      meta: { uuid: '8dd7e6cb-37f1-48eb-905c-001b095b6488', flappingHistory: [true, false] },
    });
    previouslyRecoveredAlert4 = new Alert('4', {
      meta: {
        uuid: '2652dd97-bd4f-4011-bee5-43f653362806',
        flappingHistory: [true, false, true, false, false],
      },
    });
    previouslyRecoveredAlert7 = new Alert('7', {
      meta: { uuid: '84c2cb08-7d56-432e-b8da-78ff2cc8b59a', flappingHistory: [true, true] },
    });

    previousActiveAlerts = new Map();
    previousRecoveredAlerts = new Map();
  });

  test('should set initial flapping history for new alerts', async () => {
    const alerts = [{ alert: newAlert4, category: AlertCategory.New }];
    const input = {
      // this function mutates the input alerts so clone them so we can compare the output
      alerts: cloneDeep(alerts),
      context: {
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        alertsClientContext,
        previousActiveAlerts,
        previousRecoveredAlerts,
      },
    };

    // @ts-ignore incomplete context mock
    const result = await applyFlappingHistory(input);

    // sanity check to make sure inputs are not mutated, otherwise the comparisons will be meaningless
    expect(newAlert4.getFlappingHistory()).toEqual([]);

    expect(result.length).toEqual(1);
    expect(result[0].category).toEqual(AlertCategory.New);
    expect(alertToJson(result[0].alert)).toEqual({
      ...alertToJson(newAlert4),
      flappingHistory: [true],
    });
  });

  test('should update flapping history for ongoing alerts', async () => {
    const alerts = [{ alert: ongoingAlert1, category: AlertCategory.Ongoing }];

    const input = {
      // this function mutates the input alerts so clone them so we can compare the output
      alerts: cloneDeep(alerts),
      context: {
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        alertsClientContext,
        previousActiveAlerts,
        previousRecoveredAlerts,
      },
    };

    // @ts-ignore incomplete context mock
    const result = await applyFlappingHistory(input);

    // sanity check to make sure inputs are not mutated, otherwise the comparisons will be meaningless
    expect(ongoingAlert1.getFlappingHistory()).toEqual([true, false, false]);

    expect(result.length).toEqual(1);
    expect(result[0].category).toEqual(AlertCategory.Ongoing);
    expect(alertToJson(result[0].alert)).toEqual({
      ...alertToJson(ongoingAlert1),
      flappingHistory: [...(ongoingAlert1.getFlappingHistory() ?? []), false],
    });
  });

  test('should update flapping history for recovered alerts', async () => {
    const alerts = [{ alert: recoveredAlert5, category: AlertCategory.Recovered }];

    const input = {
      // this function mutates the input alerts so clone them so we can compare the output
      alerts: cloneDeep(alerts),
      context: {
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        alertsClientContext,
        previousActiveAlerts,
        previousRecoveredAlerts,
      },
    };

    // @ts-ignore incomplete context mock
    const result = await applyFlappingHistory(input);

    // sanity check to make sure inputs are not mutated, otherwise the comparisons will be meaningless
    expect(recoveredAlert5.getFlappingHistory()).toEqual([true, false, true, false, false, false]);

    expect(result.length).toEqual(1);
    expect(result[0].category).toEqual(AlertCategory.Recovered);
    expect(alertToJson(result[0].alert)).toEqual({
      ...alertToJson(recoveredAlert5),
      flappingHistory: [...(recoveredAlert5.getFlappingHistory() ?? []), true],
    });
  });

  test('should copy flapping history and update for new alerts that are also previously recovered', async () => {
    previousRecoveredAlerts.set(previouslyRecoveredAlert4.getId(), previouslyRecoveredAlert4);

    const alerts = [{ alert: newAlert4, category: AlertCategory.New }];

    const input = {
      // this function mutates the input alerts so clone them so we can compare the output
      alerts: cloneDeep(alerts),
      context: {
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        alertsClientContext,
        previousActiveAlerts,
        previousRecoveredAlerts,
      },
    };

    // @ts-ignore incomplete context mock
    const result = await applyFlappingHistory(input);

    // sanity check to make sure inputs are not mutated, otherwise the comparisons will be meaningless
    expect(newAlert4.getFlappingHistory()).toEqual([]);
    expect(previouslyRecoveredAlert4.getFlappingHistory()).toEqual([
      true,
      false,
      true,
      false,
      false,
    ]);

    expect(result.length).toEqual(1);
    expect(result[0].category).toEqual(AlertCategory.New);
    expect(alertToJson(result[0].alert)).toEqual({
      ...alertToJson(newAlert4),
      flappingHistory: [...(previouslyRecoveredAlert4.getFlappingHistory() ?? []), true],
    });
  });

  test('should update flapping history for previous recovered alerts that are still recovered', async () => {
    previousRecoveredAlerts.set(previouslyRecoveredAlert4.getId(), previouslyRecoveredAlert4);

    const input = {
      alerts: [], // no alerts reported
      context: {
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        alertsClientContext,
        previousActiveAlerts,
        previousRecoveredAlerts,
      },
    };

    // @ts-ignore incomplete context mock
    const result = await applyFlappingHistory(input);

    // sanity check to make sure inputs are not mutated, otherwise the comparisons will be meaningless
    expect(previouslyRecoveredAlert4.getFlappingHistory()).toEqual([
      true,
      false,
      true,
      false,
      false,
    ]);

    expect(result.length).toEqual(1);
    expect(result[0].category).toEqual(AlertCategory.OngoingRecovered);
    expect(alertToJson(result[0].alert)).toEqual({
      ...alertToJson(previouslyRecoveredAlert4),
      flappingHistory: [...(previouslyRecoveredAlert4.getFlappingHistory() ?? []), false],
    });
  });

  test('should correctly update flapping history', async () => {
    previousRecoveredAlerts.set(previouslyRecoveredAlert4.getId(), previouslyRecoveredAlert4);
    previousRecoveredAlerts.set(previouslyRecoveredAlert7.getId(), previouslyRecoveredAlert7);

    const alerts = [
      { alert: ongoingAlert1, category: AlertCategory.Ongoing },
      { alert: ongoingAlert2, category: AlertCategory.Ongoing },
      { alert: newAlert3, category: AlertCategory.New },
      { alert: newAlert4, category: AlertCategory.New },
      { alert: recoveredAlert6, category: AlertCategory.Recovered },
    ];

    const input = {
      // this function mutates the input alerts so clone them so we can compare the output
      alerts: cloneDeep(alerts),
      context: {
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        alertsClientContext,
        previousActiveAlerts,
        previousRecoveredAlerts,
      },
    };

    // @ts-ignore incomplete context mock
    const result = await applyFlappingHistory(input);

    // sanity check to make sure inputs are not mutated, otherwise the comparisons will be meaningless
    expect(newAlert4.getFlappingHistory()).toEqual([]);

    expect(result.length).toEqual(6);

    // new alert that's not flapping should have a single entry [true]
    expect(result[0].category).toEqual(AlertCategory.New);
    expect(alertToJson(result[0].alert)).toEqual({
      ...alertToJson(newAlert3),
      flappingHistory: [true],
    });

    // new alert that is flapping should have flapping history copied from previously recovered alert
    expect(result[1].category).toEqual(AlertCategory.New);
    expect(alertToJson(result[1].alert)).toEqual({
      ...alertToJson(newAlert4),
      flappingHistory: [...(previouslyRecoveredAlert4.getFlappingHistory() ?? []), true],
    });

    // ongoing alert should have new entry in flapping history
    expect(result[2].category).toEqual(AlertCategory.Ongoing);
    expect(alertToJson(result[2].alert)).toEqual({
      ...alertToJson(ongoingAlert1),
      flappingHistory: [...(ongoingAlert1.getFlappingHistory() ?? []), false],
    });

    // ongoing alert should have new entry in flapping history
    expect(result[3].category).toEqual(AlertCategory.Ongoing);
    expect(alertToJson(result[3].alert)).toEqual({
      ...alertToJson(ongoingAlert2),
      flappingHistory: [...(ongoingAlert2.getFlappingHistory() ?? []), false],
    });

    // recovered alert should have new entry in flapping history
    expect(result[4].category).toEqual(AlertCategory.Recovered);
    expect(alertToJson(result[4].alert)).toEqual({
      ...alertToJson(recoveredAlert6),
      flappingHistory: [...(recoveredAlert6.getFlappingHistory() ?? []), true],
    });

    // previously recovered alert that is still recovered should have new entry in flapping history
    expect(result[5].category).toEqual(AlertCategory.OngoingRecovered);
    expect(alertToJson(result[5].alert)).toEqual({
      ...alertToJson(previouslyRecoveredAlert7),
      flappingHistory: [...(previouslyRecoveredAlert7.getFlappingHistory() ?? []), false],
    });
  });

  test('should not update flapping history if flapping is disabled', async () => {
    previousRecoveredAlerts.set(previouslyRecoveredAlert4.getId(), previouslyRecoveredAlert4);
    previousRecoveredAlerts.set(previouslyRecoveredAlert7.getId(), previouslyRecoveredAlert7);

    const alerts = [
      { alert: ongoingAlert1, category: AlertCategory.Ongoing },
      { alert: ongoingAlert2, category: AlertCategory.Ongoing },
      { alert: newAlert3, category: AlertCategory.New },
      { alert: newAlert4, category: AlertCategory.New },
      { alert: recoveredAlert6, category: AlertCategory.Recovered },
    ];

    const input = {
      // this function mutates the input alerts so clone them so we can compare the output
      alerts: cloneDeep(alerts),
      context: {
        flappingSettings: DISABLE_FLAPPING_SETTINGS,
        alertsClientContext,
        previousActiveAlerts,
        previousRecoveredAlerts,
      },
    };

    // @ts-ignore incomplete context mock
    const result = await applyFlappingHistory(input);

    expect(result.length).toEqual(6);

    expect(result[0].category).toEqual(AlertCategory.New);
    expect(alertToJson(result[0].alert)).toEqual({
      ...alertToJson(newAlert3),
      flappingHistory: [],
    });

    // TO CHECK - is this right? if flapping is disabled, should we be copying the history?
    expect(result[1].category).toEqual(AlertCategory.New);
    expect(alertToJson(result[1].alert)).toEqual({
      ...alertToJson(newAlert4),
      flappingHistory: previouslyRecoveredAlert4.getFlappingHistory() ?? [],
    });

    expect(result[2].category).toEqual(AlertCategory.Ongoing);
    expect(alertToJson(result[2].alert)).toEqual({
      ...alertToJson(ongoingAlert1),
      flappingHistory: ongoingAlert1.getFlappingHistory() ?? [],
    });

    expect(result[3].category).toEqual(AlertCategory.Ongoing);
    expect(alertToJson(result[3].alert)).toEqual({
      ...alertToJson(ongoingAlert2),
      flappingHistory: ongoingAlert2.getFlappingHistory() ?? [],
    });

    expect(result[4].category).toEqual(AlertCategory.Recovered);
    expect(alertToJson(result[4].alert)).toEqual({
      ...alertToJson(recoveredAlert6),
      flappingHistory: recoveredAlert6.getFlappingHistory() ?? [],
    });

    // TO CHECK - is this right? if flapping is disabled, do we need to track ongoing recovered?
    expect(result[5].category).toEqual(AlertCategory.OngoingRecovered);
    expect(alertToJson(result[5].alert)).toEqual({
      ...alertToJson(previouslyRecoveredAlert7),
      flappingHistory: previouslyRecoveredAlert7.getFlappingHistory() ?? [],
    });
  });
});
