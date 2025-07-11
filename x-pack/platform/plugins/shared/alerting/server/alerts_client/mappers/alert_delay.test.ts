/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertCategory } from './types';
import { Alert } from '../../alert/alert';
import { applyAlertDelay } from './alert_delay';
import { alertToJson, alertsClientContext } from './test_utils';
import { cloneDeep } from 'lodash';

describe('applyAlertDelay', () => {
  let ongoingAlert1: Alert;
  let ongoingAlert2: Alert;
  let newAlert3: Alert;
  let newAlert4: Alert;
  let recoveredAlert5: Alert;
  let recoveredAlert6: Alert;

  beforeEach(() => {
    ongoingAlert1 = new Alert('1', {
      meta: { uuid: '6f3a63fa-7291-4074-8f9f-9eb0d696b8fc', activeCount: 1 },
    });
    ongoingAlert2 = new Alert('2', {
      meta: { uuid: '8df3816a-e4bf-4fd3-b602-7a96306f356a', activeCount: 3 },
    });
    newAlert3 = new Alert('3', {
      meta: { uuid: 'c8975606-c1c5-4273-a982-f93adf228db1' },
    });
    newAlert4 = new Alert('4', {
      meta: { uuid: 'c8975606-c1c5-4273-a982-f93adf228db1' },
    });
    recoveredAlert5 = new Alert('5', {
      meta: { uuid: '07a69162-df20-443a-914d-0983e204448b', activeCount: 3 },
    });
    recoveredAlert6 = new Alert('6', {
      meta: { uuid: '8dd7e6cb-37f1-48eb-905c-001b095b6488' },
    });
  });

  test('should increment active count for new and ongoing alerts', async () => {
    const alerts = [
      { alert: ongoingAlert1, category: AlertCategory.Ongoing },
      { alert: ongoingAlert2, category: AlertCategory.Ongoing },
      { alert: newAlert3, category: AlertCategory.New },
      { alert: newAlert4, category: AlertCategory.New },
    ];
    const input = {
      // this function mutates the input alerts so clone them so we can compare the output
      alerts: cloneDeep(alerts),
      context: { alertsClientContext, alertDelay: 0 },
    };

    // @ts-ignore incomplete context mock
    const result = await applyAlertDelay(input);

    // sanity check to make sure inputs are not mutated, otherwise the comparisons will be meaningless
    expect(ongoingAlert1.getActiveCount()).toEqual(1);

    expect(result.length).toEqual(4);
    expect(result[0].category).toEqual(AlertCategory.Ongoing);
    expect(alertToJson(result[0].alert)).toEqual({ ...alertToJson(ongoingAlert1), activeCount: 2 });

    expect(result[1].category).toEqual(AlertCategory.Ongoing);
    expect(alertToJson(result[1].alert)).toEqual({ ...alertToJson(ongoingAlert2), activeCount: 4 });

    expect(result[2].category).toEqual(AlertCategory.New);
    expect(alertToJson(result[2].alert)).toEqual({ ...alertToJson(newAlert3), activeCount: 1 });

    expect(result[3].category).toEqual(AlertCategory.New);
    expect(alertToJson(result[3].alert)).toEqual({ ...alertToJson(newAlert4), activeCount: 1 });
  });

  test('should reset active count for recovered alerts', async () => {
    const alerts = [
      { alert: recoveredAlert5, category: AlertCategory.Recovered },
      { alert: recoveredAlert6, category: AlertCategory.Recovered },
    ];
    const input = {
      // this function mutates the input alerts so clone them so we can compare the output
      alerts: cloneDeep(alerts),
      context: { alertsClientContext, alertDelay: 0 },
    };

    // @ts-ignore incomplete context mock
    const result = await applyAlertDelay(input);

    // sanity check to make sure inputs are not mutated, otherwise the comparisons will be meaningless
    expect(recoveredAlert5.getActiveCount()).toEqual(3);

    expect(result.length).toEqual(2);
    expect(result[0].category).toEqual(AlertCategory.Recovered);
    expect(alertToJson(result[0].alert)).toEqual({
      ...alertToJson(recoveredAlert5),
      activeCount: 0,
    });

    expect(result[1].category).toEqual(AlertCategory.Recovered);
    expect(alertToJson(result[1].alert)).toEqual({
      ...alertToJson(recoveredAlert6),
      activeCount: 0,
    });
  });

  test('should remove new and ongoing alerts if active count is less than alert delay', async () => {
    const alerts = [
      { alert: ongoingAlert1, category: AlertCategory.Ongoing },
      { alert: ongoingAlert2, category: AlertCategory.Ongoing },
      { alert: newAlert3, category: AlertCategory.New },
      { alert: newAlert4, category: AlertCategory.New },
    ];
    const input = {
      // this function mutates the input alerts so clone them so we can compare the output
      alerts: cloneDeep(alerts),
      context: { alertsClientContext, alertDelay: 3 },
    };

    // @ts-ignore incomplete context mock
    const result = await applyAlertDelay(input);

    // sanity check to make sure inputs are not mutated, otherwise the comparisons will be meaningless
    expect(ongoingAlert1.getActiveCount()).toEqual(1);

    expect(result.length).toEqual(1);
    expect(result[0].category).toEqual(AlertCategory.Ongoing);
    expect(alertToJson(result[0].alert)).toEqual({ ...alertToJson(ongoingAlert2), activeCount: 4 });
  });

  test('should remove recovered alerts if active count is less than alert delay', async () => {
    const alerts = [
      { alert: recoveredAlert5, category: AlertCategory.Recovered },
      { alert: recoveredAlert6, category: AlertCategory.Recovered },
    ];
    const input = {
      // this function mutates the input alerts so clone them so we can compare the output
      alerts: cloneDeep(alerts),
      context: { alertsClientContext, alertDelay: 2 },
    };

    // @ts-ignore incomplete context mock
    const result = await applyAlertDelay(input);

    // sanity check to make sure inputs are not mutated, otherwise the comparisons will be meaningless
    expect(recoveredAlert5.getActiveCount()).toEqual(3);

    expect(result.length).toEqual(1);
    expect(result[0].category).toEqual(AlertCategory.Recovered);
    expect(alertToJson(result[0].alert)).toEqual({
      ...alertToJson(recoveredAlert5),
      activeCount: 0,
    });
  });

  test('should recategorize ongoing alert as new alert if active count equals alert delay', async () => {
    const alerts = [
      { alert: ongoingAlert1, category: AlertCategory.Ongoing },
      { alert: ongoingAlert2, category: AlertCategory.Ongoing },
      { alert: newAlert3, category: AlertCategory.New },
      { alert: newAlert4, category: AlertCategory.New },
    ];
    const input = {
      // this function mutates the input alerts so clone them so we can compare the output
      alerts: cloneDeep(alerts),
      context: { alertsClientContext, alertDelay: 4 },
    };

    // @ts-ignore incomplete context mock
    const result = await applyAlertDelay(input);

    // sanity check to make sure inputs are not mutated, otherwise the comparisons will be meaningless
    expect(ongoingAlert1.getActiveCount()).toEqual(1);

    expect(result.length).toEqual(1);
    expect(result[0].category).toEqual(AlertCategory.New);
    expect(alertToJson(result[0].alert)).toEqual({
      ...alertToJson(ongoingAlert2),
      duration: '0',
      activeCount: 4,
    });
  });
});
