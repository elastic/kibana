/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { Alert } from '../../alert/alert';
import { applyFlappingRecovery } from './flapping_recovery';
import { alertToJson, alertsClientContext } from './test_utils';
import { DEFAULT_FLAPPING_SETTINGS } from '../../types';
import { AlertCategory } from './types';

describe('applyFlappingRecovery', () => {
  let ongoingAlert1: Alert;
  let ongoingAlert2: Alert;
  let newAlert3: Alert;
  let recoveredAlert5: Alert;
  let recoveredAlert6: Alert;
  let recoveredAlert7: Alert;

  beforeEach(() => {
    ongoingAlert1 = new Alert('1', {
      meta: {
        uuid: '6f3a63fa-7291-4074-8f9f-9eb0d696b8fc',
        flapping: false,
        pendingRecoveredCount: 3,
      },
    });
    ongoingAlert2 = new Alert('2', {
      meta: { uuid: '8df3816a-e4bf-4fd3-b602-7a96306f356a', pendingRecoveredCount: 1 },
    });
    newAlert3 = new Alert('3', {
      meta: { uuid: '902e99bb-d9d9-4dc3-87c4-4778c2d6dcb8', flapping: true },
    });
    recoveredAlert5 = new Alert('5', {
      meta: {
        uuid: '07a69162-df20-443a-914d-0983e204448b',
        flapping: false,
        pendingRecoveredCount: 2,
      },
    });
    recoveredAlert6 = new Alert('6', {
      meta: {
        uuid: '8dd7e6cb-37f1-48eb-905c-001b095b6488',
        flapping: true,
        pendingRecoveredCount: 5,
      },
    });
    recoveredAlert7 = new Alert('7', {
      meta: {
        uuid: 'f6bbb0fc-9f2e-4ebf-a4e9-b352e27192b6',
        flapping: true,
        pendingRecoveredCount: 2,
      },
    });
  });

  test('should reset pending recovered count for new and ongoing alerts', async () => {
    const alerts = [
      { alert: ongoingAlert1, category: AlertCategory.Ongoing },
      { alert: ongoingAlert2, category: AlertCategory.Ongoing },
      { alert: newAlert3, category: AlertCategory.New },
    ];
    const input = {
      // this function mutates the input alerts so clone them so we can compare the output
      alerts: cloneDeep(alerts),
      context: {
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        alertsClientContext,
      },
    };

    // @ts-ignore incomplete context mock
    const result = await applyFlappingRecovery(input);

    // sanity check to make sure inputs are not mutated, otherwise the comparisons will be meaningless
    expect(ongoingAlert1.getPendingRecoveredCount()).toEqual(3);

    expect(result.length).toEqual(3);
    expect(result[0].category).toEqual(AlertCategory.Ongoing);
    expect(alertToJson(result[0].alert)).toEqual({
      ...alertToJson(ongoingAlert1),
      pendingRecoveredCount: 0,
    });
    expect(result[1].category).toEqual(AlertCategory.Ongoing);
    expect(alertToJson(result[1].alert)).toEqual({
      ...alertToJson(ongoingAlert2),
      pendingRecoveredCount: 0,
    });
    expect(result[2].category).toEqual(AlertCategory.New);
    expect(alertToJson(result[2].alert)).toEqual({
      ...alertToJson(newAlert3),
      pendingRecoveredCount: 0,
    });
  });

  test('should not reset pending recovered count for recovered alerts that are not flapping', async () => {
    const alerts = [{ alert: recoveredAlert5, category: AlertCategory.Recovered }];
    const input = {
      // this function mutates the input alerts so clone them so we can compare the output
      alerts: cloneDeep(alerts),
      context: {
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        alertsClientContext,
      },
    };

    // @ts-ignore incomplete context mock
    const result = await applyFlappingRecovery(input);

    // sanity check to make sure inputs are not mutated, otherwise the comparisons will be meaningless
    expect(recoveredAlert5.getPendingRecoveredCount()).toEqual(2);

    expect(result.length).toEqual(1);
    expect(result[0].category).toEqual(AlertCategory.Recovered);
    expect(alertToJson(result[0].alert)).toEqual({
      ...alertToJson(recoveredAlert5),
    });
  });

  test('should reset pending recovered count for recovered alerts that are flapping and have recovered more than the threshold', async () => {
    const alerts = [{ alert: recoveredAlert6, category: AlertCategory.Recovered }];
    const input = {
      // this function mutates the input alerts so clone them so we can compare the output
      alerts: cloneDeep(alerts),
      context: {
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        alertsClientContext,
      },
    };

    // @ts-ignore incomplete context mock
    const result = await applyFlappingRecovery(input);

    // sanity check to make sure inputs are not mutated, otherwise the comparisons will be meaningless
    expect(recoveredAlert6.getPendingRecoveredCount()).toEqual(5);

    expect(result.length).toEqual(1);
    expect(result[0].category).toEqual(AlertCategory.Recovered);
    expect(alertToJson(result[0].alert)).toEqual({
      ...alertToJson(recoveredAlert6),
      pendingRecoveredCount: 0,
    });
  });

  test('should increment pending recovered count and schedule action for recovered alerts that are flapping and have not met the threshold', async () => {
    recoveredAlert7.setContext({ foo: true });
    const alerts = [{ alert: recoveredAlert7, category: AlertCategory.Recovered }];
    const input = {
      // this function mutates the input alerts so clone them so we can compare the output
      alerts: cloneDeep(alerts),
      context: {
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        alertsClientContext,
      },
    };

    // @ts-ignore incomplete context mock
    const result = await applyFlappingRecovery(input);

    // sanity check to make sure inputs are not mutated, otherwise the comparisons will be meaningless
    expect(recoveredAlert7.getPendingRecoveredCount()).toEqual(2);

    expect(result.length).toEqual(1);
    expect(result[0].category).toEqual(AlertCategory.Ongoing);
    expect(alertToJson(result[0].alert)).toEqual({
      ...alertToJson(recoveredAlert7),
      pendingRecoveredCount: 3,
    });

    expect(result[0].alert.getContext()).toEqual({ foo: true });
    expect(result[0].alert.hasScheduledActions()).toEqual(true);
  });
});
