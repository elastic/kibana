/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { Alert } from '../../alert/alert';
import { applyAlertLimit } from './alert_limit';
import { alertToJson, alertsClientContext } from './test_utils';
import { cloneDeep } from 'lodash';
import { AlertCategory, type AlertsResult } from './types';
import type { AlertInstanceState as S, AlertInstanceContext as C } from '../../types';

describe('applyAlertLimit', () => {
  let clock: sinon.SinonFakeTimers;
  let startedAt: string;
  let existingAlert1: Alert;
  let existingAlert2: Alert;
  let existingAlert3: Alert;
  let existingAlert4: Alert;
  let existingAlert5: Alert;
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
    clock = sinon.useFakeTimers();
    startedAt = new Date().toISOString();
  });

  beforeEach(() => {
    clock.reset();

    existingAlert1 = new Alert('1', {
      state: { start: '1969-12-31T07:34:00.000Z', duration: 54243 },
      meta: { uuid: '6f3a63fa-7291-4074-8f9f-9eb0d696b8fc' },
    });
    existingAlert2 = new Alert('2', {
      state: { start: '1969-12-30T03:28:00.000Z', duration: 572237 },
      meta: { uuid: '8df3816a-e4bf-4fd3-b602-7a96306f356a' },
    });
    existingAlert3 = new Alert('3', {
      state: { start: '1969-12-31T09:12:03.000Z', duration: 689753 },
      meta: { uuid: '902e99bb-d9d9-4dc3-87c4-4778c2d6dcb8' },
    });
    existingAlert4 = new Alert('4', {
      state: { start: '1969-12-31T09:12:03.000Z', duration: 34546 },
      meta: { uuid: 'c8736506-c4a9-4ff2-a3cd-1596643c27ad' },
    });
    existingAlert5 = new Alert('5', {
      state: { start: '1969-12-30T09:23:10.000Z', duration: 6867 },
      meta: { uuid: 'd64bbe6f-9722-40c4-ba85-f6fe95a8f964' },
    });
    ongoingAlert1 = new Alert('1', {
      state: { start: '1969-12-31T07:34:00.000Z', duration: 59160000 },
      meta: { uuid: '6f3a63fa-7291-4074-8f9f-9eb0d696b8fc' },
    });
    ongoingAlert2 = new Alert('2', {
      state: { start: '1969-12-30T03:28:00.000Z', duration: 160320000 },
      meta: { uuid: '8df3816a-e4bf-4fd3-b602-7a96306f356a' },
    });
    ongoingAlert3 = new Alert('3', {
      state: { start: '1969-12-31T09:12:03.000Z', duration: 53277000 },
      meta: { uuid: '902e99bb-d9d9-4dc3-87c4-4778c2d6dcb8' },
    });
    ongoingAlert4 = new Alert('4', {
      state: { start: '1969-12-31T09:12:03.000Z', duration: 53277000 },
      meta: { uuid: 'c8736506-c4a9-4ff2-a3cd-1596643c27ad' },
    });
    ongoingAlert5 = new Alert('5', {
      state: { start: '1969-12-30T09:23:10.000Z', duration: 139010000 },
      meta: { uuid: 'd64bbe6f-9722-40c4-ba85-f6fe95a8f964' },
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
      meta: { uuid: '07a69162-df20-443a-914d-0983e204448b' },
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
    previousActiveAlerts.set(existingAlert1.getId(), existingAlert1);
    previousActiveAlerts.set(existingAlert2.getId(), existingAlert2);
    previousActiveAlerts.set(existingAlert3.getId(), existingAlert3);
    previousActiveAlerts.set(existingAlert4.getId(), existingAlert4);
    previousActiveAlerts.set(existingAlert5.getId(), existingAlert5);

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

  afterAll(() => clock.restore());

  test('returns all alerts as-is when alert limit has not been reached', async () => {
    const result = await applyAlertLimit<S, C, string, string>({
      // this function mutates the input alerts so clone them so we can compare the output
      alerts: cloneDeep(alerts),
      // @ts-ignore incomplete context mock
      context: {
        alertsClientContext,
        hasReachedAlertLimit: false,
        maxAlerts: 7,
        previousActiveAlerts,
        previousRecoveredAlerts,
        startedAt,
      },
    });

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

  test('returns existing alerts as ongoing when alert limit has been reached and updates duration', async () => {
    const result = await applyAlertLimit({
      // this function mutates the input alerts so clone them so we can compare the output
      alerts: cloneDeep(alerts),
      // @ts-ignore incomplete context mock
      context: {
        alertsClientContext,
        hasReachedAlertLimit: true,
        maxAlerts: 5,
        previousActiveAlerts,
        previousRecoveredAlerts,
        startedAt,
      },
    });

    // sanity check to make sure inputs are not mutated, otherwise the comparisons will be meaningless
    expect(existingAlert1.getState().duration).toEqual(54243);

    expect(result.length).toEqual(5);

    // keeps existing alerts and converts them to ongoing with updated duration
    expect(result[0].category).toEqual(AlertCategory.Ongoing);
    expect(alertToJson(result[0].alert)).toEqual({
      ...alertToJson(existingAlert1),
      duration: '59160000000000',
    });

    expect(result[1].category).toEqual(AlertCategory.Ongoing);
    expect(alertToJson(result[1].alert)).toEqual({
      ...alertToJson(existingAlert2),
      duration: '160320000000000',
    });

    expect(result[2].category).toEqual(AlertCategory.Ongoing);
    expect(alertToJson(result[2].alert)).toEqual({
      ...alertToJson(existingAlert3),
      duration: '53277000000000',
    });

    expect(result[3].category).toEqual(AlertCategory.Ongoing);
    expect(alertToJson(result[3].alert)).toEqual({
      ...alertToJson(existingAlert4),
      duration: '53277000000000',
    });

    expect(result[4].category).toEqual(AlertCategory.Ongoing);
    expect(alertToJson(result[4].alert)).toEqual({
      ...alertToJson(existingAlert5),
      duration: '139010000000000',
    });

    // filters out recovered alerts
  });

  test('adds new alerts up to the max allowed when alert limit has been reached', async () => {
    const result = await applyAlertLimit({
      // this function mutates the input alerts so clone them so we can compare the output
      alerts: cloneDeep(alerts),
      // @ts-ignore incomplete context mock
      context: {
        alertsClientContext,
        hasReachedAlertLimit: true,
        maxAlerts: 6,
        previousActiveAlerts,
        previousRecoveredAlerts,
        startedAt,
      },
    });

    // sanity check to make sure inputs are not mutated, otherwise the comparisons will be meaningless
    expect(existingAlert1.getState().duration).toEqual(54243);

    expect(result.length).toEqual(6);

    // keeps existing alerts and converts them to ongoing with updated duration
    expect(result[0].category).toEqual(AlertCategory.Ongoing);
    expect(alertToJson(result[0].alert)).toEqual({
      ...alertToJson(existingAlert1),
      duration: '59160000000000',
    });

    expect(result[1].category).toEqual(AlertCategory.Ongoing);
    expect(alertToJson(result[1].alert)).toEqual({
      ...alertToJson(existingAlert2),
      duration: '160320000000000',
    });

    expect(result[2].category).toEqual(AlertCategory.Ongoing);
    expect(alertToJson(result[2].alert)).toEqual({
      ...alertToJson(existingAlert3),
      duration: '53277000000000',
    });

    expect(result[3].category).toEqual(AlertCategory.Ongoing);
    expect(alertToJson(result[3].alert)).toEqual({
      ...alertToJson(existingAlert4),
      duration: '53277000000000',
    });

    expect(result[4].category).toEqual(AlertCategory.Ongoing);
    expect(alertToJson(result[4].alert)).toEqual({
      ...alertToJson(existingAlert5),
      duration: '139010000000000',
    });

    // adds new alerts up to allowed capacity
    expect(result[5].category).toEqual(AlertCategory.New);
    expect(alertToJson(result[5].alert)).toEqual(alertToJson(newAlert6));

    // filters out recovered alerts
  });
});
