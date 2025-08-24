/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { cloneDeep } from 'lodash';
import { categorizeAlerts } from './categorize_alerts';
import { Alert } from '../alert';
import type { AlertInstanceState, AlertInstanceContext } from '../types';
import { AlertCategory } from '../alerts_client/mappers/types';

describe('categorizeAlerts', () => {
  let clock: sinon.SinonFakeTimers;
  let startedAt: string;

  beforeAll(() => {
    clock = sinon.useFakeTimers();
    startedAt = new Date().toISOString();
  });

  beforeEach(() => {
    clock.reset();
  });

  afterAll(() => clock.restore());

  describe('newAlerts', () => {
    test('considers alert new if it has scheduled actions and its id is not in existingAlertIds', () => {
      const newAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1', {
        meta: { uuid: '111' },
      });
      const existingAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('2', {
        meta: { uuid: '222' },
      });
      const existingAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('3', {
        meta: { uuid: '333' },
      });

      const existingAlerts = new Map();
      existingAlerts.set('2', existingAlert1);
      existingAlerts.set('3', existingAlert2);

      const updatedAlerts = new Map();
      updatedAlerts.set('1', newAlert.scheduleActions('default' as never, { foo: '1' }));
      updatedAlerts.set(
        '2',
        cloneDeep(existingAlert1).scheduleActions('default' as never, { foo: '1' })
      );
      updatedAlerts.set(
        '3',
        cloneDeep(existingAlert2).scheduleActions('default' as never, { foo: '2' })
      );

      const categorizedAlerts = categorizeAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        autoRecoverAlerts: true,
        startedAt,
      });

      // 2 existing, 2 ongoing, 1 new
      expect(categorizedAlerts).toHaveLength(3);
      expect(categorizedAlerts).toEqual([
        {
          alert: newAlert.replaceState({
            duration: '0',
            start: '1970-01-01T00:00:00.000Z',
          }),
          category: AlertCategory.New,
        },
        { alert: updatedAlerts.get('2'), category: AlertCategory.Ongoing },
        { alert: updatedAlerts.get('3'), category: AlertCategory.Ongoing },
      ]);

      const newAlertIds = categorizedAlerts
        .filter(({ category }) => category === AlertCategory.New)
        .map(({ alert }) => alert.getId());

      expect(newAlertIds).toEqual(['1']);
    });

    test('sets start time in new alert state', () => {
      const newAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('1', {
        meta: { uuid: '111' },
      });
      const newAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('2', {
        meta: { uuid: '222' },
      });
      const existingAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('3', {
        meta: { uuid: '333' },
      });
      const existingAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('4', {
        meta: { uuid: '444' },
      });

      const existingAlerts = new Map();
      existingAlerts.set('3', existingAlert1);
      existingAlerts.set('4', existingAlert2);

      const updatedAlerts = new Map();
      updatedAlerts.set('1', newAlert1.scheduleActions('default' as never, { foo: '1' }));
      updatedAlerts.set('2', newAlert2.scheduleActions('default' as never, { foo: '1' }));
      updatedAlerts.set(
        '3',
        cloneDeep(existingAlert1).scheduleActions('default' as never, { foo: '1' })
      );
      updatedAlerts.set(
        '4',
        cloneDeep(existingAlert2).scheduleActions('default' as never, { foo: '2' })
      );

      expect(newAlert1.getState()).toStrictEqual({});
      expect(newAlert2.getState()).toStrictEqual({});

      const categorizedAlerts = categorizeAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        autoRecoverAlerts: true,
        startedAt,
      });

      const newAlerts = categorizedAlerts.filter(({ category }) => category === AlertCategory.New);
      const newAlertIds = newAlerts.map(({ alert }) => alert.getId());

      expect(newAlertIds).toEqual(['1', '2']);

      const newAlert1State = newAlerts[0].alert.getState();
      const newAlert2State = newAlerts[1].alert.getState();

      expect(newAlert1State.start).toEqual('1970-01-01T00:00:00.000Z');
      expect(newAlert2State.start).toEqual('1970-01-01T00:00:00.000Z');

      expect(newAlert1State.duration).toEqual('0');
      expect(newAlert2State.duration).toEqual('0');

      expect(newAlert1State.end).not.toBeDefined();
      expect(newAlert2State.end).not.toBeDefined();
    });

    test('sets start time with startedAt in new alert state if provided', () => {
      const newAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const newAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
      const existingAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('3');
      const existingAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('4');

      const existingAlerts = new Map();
      existingAlerts.set('3', existingAlert1);
      existingAlerts.set('4', existingAlert2);

      const updatedAlerts = new Map();
      updatedAlerts.set('1', newAlert1.scheduleActions('default' as never, { foo: '1' }));
      updatedAlerts.set('2', newAlert2.scheduleActions('default' as never, { foo: '1' }));
      updatedAlerts.set(
        '3',
        cloneDeep(existingAlert1).scheduleActions('default' as never, { foo: '1' })
      );
      updatedAlerts.set(
        '4',
        cloneDeep(existingAlert2).scheduleActions('default' as never, { foo: '2' })
      );

      expect(newAlert1.getState()).toStrictEqual({});
      expect(newAlert2.getState()).toStrictEqual({});

      const categorizedAlerts = categorizeAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        autoRecoverAlerts: true,
        startedAt: '2023-10-03T20:03:08.716Z',
      });

      const newAlerts = categorizedAlerts.filter(({ category }) => category === AlertCategory.New);
      const newAlertIds = newAlerts.map(({ alert }) => alert.getId());

      expect(newAlertIds).toEqual(['1', '2']);

      const newAlert1State = newAlerts[0].alert.getState();
      const newAlert2State = newAlerts[1].alert.getState();

      expect(newAlert1State.start).toEqual('2023-10-03T20:03:08.716Z');
      expect(newAlert2State.start).toEqual('2023-10-03T20:03:08.716Z');

      expect(newAlert1State.duration).toEqual('0');
      expect(newAlert2State.duration).toEqual('0');

      expect(newAlert1State.end).not.toBeDefined();
      expect(newAlert2State.end).not.toBeDefined();
    });
  });

  describe('ongoingAlerts', () => {
    test('considers alert ongoing if it has scheduled actions and it exists in existingAlertIds', () => {
      const newAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const existingAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
      const existingAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('3');

      const existingAlerts = new Map();
      existingAlerts.set('2', existingAlert1);
      existingAlerts.set('3', existingAlert2);

      const updatedAlerts = new Map();
      updatedAlerts.set('1', newAlert.scheduleActions('default' as never, { foo: '1' }));
      updatedAlerts.set(
        '2',
        cloneDeep(existingAlert1).scheduleActions('default' as never, { foo: '1' })
      );
      updatedAlerts.set(
        '3',
        cloneDeep(existingAlert2).scheduleActions('default' as never, { foo: '2' })
      );

      const categorizedAlerts = categorizeAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        autoRecoverAlerts: true,
        startedAt,
      });

      const ongoingAlertIds = categorizedAlerts
        .filter(({ category }) => category === AlertCategory.Ongoing)
        .map(({ alert }) => alert.getId());

      expect(ongoingAlertIds).toEqual(['2', '3']);
    });

    test('updates duration in ongoing alerts if start is available', () => {
      const newAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const existingAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('2', {
        state: { start: '1969-12-30T00:00:00.000Z', duration: 33000 },
      });
      const existingAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('3', {
        state: { start: '1969-12-31T07:34:00.000Z', duration: 23532 },
      });

      const existingAlerts = new Map();
      existingAlerts.set('2', existingAlert1);
      existingAlerts.set('3', existingAlert2);

      const updatedAlerts = new Map();
      updatedAlerts.set('1', newAlert.scheduleActions('default' as never, { foo: '1' }));
      updatedAlerts.set(
        '2',
        cloneDeep(existingAlert1).scheduleActions('default' as never, { foo: '1' })
      );
      updatedAlerts.set(
        '3',
        cloneDeep(existingAlert2).scheduleActions('default' as never, { foo: '2' })
      );

      const categorizedAlerts = categorizeAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        autoRecoverAlerts: true,
        startedAt,
      });

      const ongoingAlerts = categorizedAlerts.filter(
        ({ category }) => category === AlertCategory.Ongoing
      );
      const ongoingAlertIds = ongoingAlerts.map(({ alert }) => alert.getId());

      expect(ongoingAlertIds).toEqual(['2', '3']);

      const activeAlert1State = ongoingAlerts[0].alert.getState();
      const activeAlert2State = ongoingAlerts[1].alert.getState();

      expect(activeAlert1State.start).toEqual('1969-12-30T00:00:00.000Z');
      expect(activeAlert2State.start).toEqual('1969-12-31T07:34:00.000Z');

      expect(activeAlert1State.duration).toEqual('172800000000000');
      expect(activeAlert2State.duration).toEqual('59160000000000');

      expect(activeAlert1State.end).not.toBeDefined();
      expect(activeAlert2State.end).not.toBeDefined();
    });

    test('does not update duration in ongoing alerts if start is not available', () => {
      const newAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const existingAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
      const existingAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('3');

      const existingAlerts = new Map();
      existingAlerts.set('2', existingAlert1);
      existingAlerts.set('3', existingAlert2);

      const updatedAlerts = new Map();
      updatedAlerts.set('1', newAlert.scheduleActions('default' as never, { foo: '1' }));
      updatedAlerts.set(
        '2',
        cloneDeep(existingAlert1).scheduleActions('default' as never, { foo: '1' })
      );
      updatedAlerts.set(
        '3',
        cloneDeep(existingAlert2).scheduleActions('default' as never, { foo: '2' })
      );

      const categorizedAlerts = categorizeAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        autoRecoverAlerts: true,
        startedAt,
      });

      const ongoingAlerts = categorizedAlerts.filter(
        ({ category }) => category === AlertCategory.Ongoing
      );
      const ongoingAlertIds = ongoingAlerts.map(({ alert }) => alert.getId());

      expect(ongoingAlertIds).toEqual(['2', '3']);

      const activeAlert1State = ongoingAlerts[0].alert.getState();
      const activeAlert2State = ongoingAlerts[1].alert.getState();

      expect(activeAlert1State.start).not.toBeDefined();
      expect(activeAlert2State.start).not.toBeDefined();

      expect(activeAlert1State.duration).not.toBeDefined();
      expect(activeAlert2State.duration).not.toBeDefined();

      expect(activeAlert1State.end).not.toBeDefined();
      expect(activeAlert2State.end).not.toBeDefined();
    });

    test('preserves other state fields', () => {
      const newAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const existingAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('2', {
        state: { stateField1: 'xyz', start: '1969-12-30T00:00:00.000Z', duration: 33000 },
      });
      const existingAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('3', {
        state: { anotherState: true, start: '1969-12-31T07:34:00.000Z', duration: 23532 },
      });

      const existingAlerts = new Map();
      existingAlerts.set('2', existingAlert1);
      existingAlerts.set('3', existingAlert2);

      const updatedAlerts = new Map();
      updatedAlerts.set('1', newAlert.scheduleActions('default' as never, { foo: '1' }));
      updatedAlerts.set(
        '2',
        cloneDeep(existingAlert1).scheduleActions('default' as never, { foo: '1' })
      );
      updatedAlerts.set(
        '3',
        cloneDeep(existingAlert2).scheduleActions('default' as never, { foo: '2' })
      );

      const categorizedAlerts = categorizeAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        autoRecoverAlerts: true,
        startedAt,
      });

      const ongoingAlerts = categorizedAlerts.filter(
        ({ category }) => category === AlertCategory.Ongoing
      );
      const ongoingAlertIds = ongoingAlerts.map(({ alert }) => alert.getId());

      expect(ongoingAlertIds).toEqual(['2', '3']);

      const activeAlert1State = ongoingAlerts[0].alert.getState();
      const activeAlert2State = ongoingAlerts[1].alert.getState();

      expect(activeAlert1State.start).toEqual('1969-12-30T00:00:00.000Z');
      expect(activeAlert2State.start).toEqual('1969-12-31T07:34:00.000Z');

      expect(activeAlert1State.stateField1).toEqual('xyz');
      expect(activeAlert2State.anotherState).toEqual(true);

      expect(activeAlert1State.duration).toEqual('172800000000000');
      expect(activeAlert2State.duration).toEqual('59160000000000');

      expect(activeAlert1State.end).not.toBeDefined();
      expect(activeAlert2State.end).not.toBeDefined();
    });

    test('preserves changes to other state fields', () => {
      const newAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const existingAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('2', {
        state: { stateField1: 'xyz', start: '1969-12-30T00:00:00.000Z', duration: 33000 },
      });
      const existingAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('3', {
        state: { anotherState: true, start: '1969-12-31T07:34:00.000Z', duration: 23532 },
      });

      const existingAlerts = new Map();
      existingAlerts.set('2', existingAlert1);
      existingAlerts.set('3', existingAlert2);

      const updatedAlerts = new Map();
      updatedAlerts.set('1', newAlert.scheduleActions('default' as never, { foo: '1' }));
      updatedAlerts.set(
        '2',
        cloneDeep(existingAlert1)
          .scheduleActions('default' as never, { foo: '1' })
          .replaceState({ stateField1: 'abc' })
      );
      updatedAlerts.set(
        '3',
        cloneDeep(existingAlert2)
          .scheduleActions('default' as never, { foo: '2' })
          .replaceState({ anotherState: false })
      );

      const categorizedAlerts = categorizeAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        autoRecoverAlerts: true,
        startedAt,
      });

      const ongoingAlerts = categorizedAlerts.filter(
        ({ category }) => category === AlertCategory.Ongoing
      );
      const ongoingAlertIds = ongoingAlerts.map(({ alert }) => alert.getId());

      expect(ongoingAlertIds).toEqual(['2', '3']);

      const activeAlert1State = ongoingAlerts[0].alert.getState();
      const activeAlert2State = ongoingAlerts[1].alert.getState();

      expect(activeAlert1State.start).toEqual('1969-12-30T00:00:00.000Z');
      expect(activeAlert2State.start).toEqual('1969-12-31T07:34:00.000Z');

      expect(activeAlert1State.stateField1).toEqual('abc');
      expect(activeAlert2State.anotherState).toEqual(false);

      expect(activeAlert1State.duration).toEqual('172800000000000');
      expect(activeAlert2State.duration).toEqual('59160000000000');

      expect(activeAlert1State.end).not.toBeDefined();
      expect(activeAlert2State.end).not.toBeDefined();
    });
  });

  describe('recoveredAlerts', () => {
    test('considers alert recovered if it has no scheduled actions', () => {
      const activeAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const recoveredAlert = new Alert<AlertInstanceState, AlertInstanceContext>('2');

      const existingAlerts = new Map();
      existingAlerts.set('1', activeAlert);
      existingAlerts.set('2', recoveredAlert);

      const updatedAlerts = new Map();
      updatedAlerts.set(
        '1',
        cloneDeep(activeAlert).scheduleActions('default' as never, { foo: '1' })
      );
      updatedAlerts.set('2', cloneDeep(recoveredAlert).setContext({ foo: '2' }));

      const categorizedAlerts = categorizeAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        autoRecoverAlerts: true,
        startedAt,
      });

      const recoveredAlertIds = categorizedAlerts
        .filter(({ category }) => category === AlertCategory.Recovered)
        .map(({ alert }) => alert.getId());

      expect(recoveredAlertIds).toEqual(['2']);
    });

    test('does not consider alert recovered if it has no actions but was not in original alerts list', () => {
      const activeAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const notRecoveredAlert = new Alert<AlertInstanceState, AlertInstanceContext>('2');

      const existingAlerts = new Map();
      existingAlerts.set('1', activeAlert);

      const updatedAlerts = new Map();
      updatedAlerts.set(
        '1',
        cloneDeep(activeAlert).scheduleActions('default' as never, { foo: '1' })
      );
      updatedAlerts.set('2', notRecoveredAlert);

      const categorizedAlerts = categorizeAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        autoRecoverAlerts: true,
        startedAt,
      });

      const recoveredAlertIds = categorizedAlerts
        .filter(({ category }) => category === AlertCategory.Recovered)
        .map(({ alert }) => alert.getId());

      expect(recoveredAlertIds).toEqual([]);
    });

    test('updates duration in recovered alerts if start is available and adds end time', () => {
      const activeAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const recoveredAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('2', {
        state: { start: '1969-12-30T00:00:00.000Z', duration: 33000 },
      });
      const recoveredAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('3', {
        state: { start: '1969-12-31T07:34:00.000Z', duration: 23532 },
      });

      const existingAlerts = new Map();
      existingAlerts.set('1', activeAlert);
      existingAlerts.set('2', recoveredAlert1);
      existingAlerts.set('3', recoveredAlert2);

      const updatedAlerts = new Map();
      updatedAlerts.set(
        '1',
        cloneDeep(activeAlert).scheduleActions('default' as never, { foo: '1' })
      );
      updatedAlerts.set('2', cloneDeep(recoveredAlert1));
      updatedAlerts.set('3', cloneDeep(recoveredAlert2));

      const categorizedAlerts = categorizeAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        autoRecoverAlerts: true,
        startedAt,
      });

      const recoveredAlerts = categorizedAlerts.filter(
        ({ category }) => category === AlertCategory.Recovered
      );
      const recoveredAlertIds = recoveredAlerts.map(({ alert }) => alert.getId());

      expect(recoveredAlertIds).toEqual(['2', '3']);

      const recoveredAlert1State = recoveredAlerts[0].alert.getState();
      const recoveredAlert2State = recoveredAlerts[1].alert.getState();

      expect(recoveredAlert1State.start).toEqual('1969-12-30T00:00:00.000Z');
      expect(recoveredAlert2State.start).toEqual('1969-12-31T07:34:00.000Z');

      expect(recoveredAlert1State.duration).toEqual('172800000000000');
      expect(recoveredAlert2State.duration).toEqual('59160000000000');

      expect(recoveredAlert1State.end).toEqual('1970-01-01T00:00:00.000Z');
      expect(recoveredAlert2State.end).toEqual('1970-01-01T00:00:00.000Z');
    });

    test('updates duration in recovered alerts if start is available and adds end time to startedAt if provided', () => {
      const activeAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const recoveredAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('2', {
        state: { start: '1969-12-30T00:00:00.000Z', duration: 33000 },
      });
      const recoveredAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('3', {
        state: { start: '1969-12-31T07:34:00.000Z', duration: 23532 },
      });

      const existingAlerts = new Map();
      existingAlerts.set('1', activeAlert);
      existingAlerts.set('2', recoveredAlert1);
      existingAlerts.set('3', recoveredAlert2);

      const updatedAlerts = new Map();
      updatedAlerts.set(
        '1',
        cloneDeep(activeAlert).scheduleActions('default' as never, { foo: '1' })
      );
      updatedAlerts.set('2', cloneDeep(recoveredAlert1));
      updatedAlerts.set('3', cloneDeep(recoveredAlert2));

      const categorizedAlerts = categorizeAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        autoRecoverAlerts: true,
        startedAt: '2023-10-03T20:03:08.716Z',
      });

      const recoveredAlerts = categorizedAlerts.filter(
        ({ category }) => category === AlertCategory.Recovered
      );
      const recoveredAlertIds = recoveredAlerts.map(({ alert }) => alert.getId());

      expect(recoveredAlertIds).toEqual(['2', '3']);

      const recoveredAlert1State = recoveredAlerts[0].alert.getState();
      const recoveredAlert2State = recoveredAlerts[1].alert.getState();

      expect(recoveredAlert1State.start).toEqual('1969-12-30T00:00:00.000Z');
      expect(recoveredAlert2State.start).toEqual('1969-12-31T07:34:00.000Z');

      expect(recoveredAlert1State.duration).toEqual('1696536188716000000');
      expect(recoveredAlert2State.duration).toEqual('1696422548716000000');

      expect(recoveredAlert1State.end).toEqual('2023-10-03T20:03:08.716Z');
      expect(recoveredAlert2State.end).toEqual('2023-10-03T20:03:08.716Z');
    });

    test('does not update duration or set end in recovered alerts if start is not available', () => {
      const activeAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const recoveredAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
      const recoveredAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('3');

      const existingAlerts = new Map();
      existingAlerts.set('1', activeAlert);
      existingAlerts.set('2', recoveredAlert1);
      existingAlerts.set('3', recoveredAlert2);

      const updatedAlerts = new Map();
      updatedAlerts.set(
        '1',
        cloneDeep(activeAlert).scheduleActions('default' as never, { foo: '1' })
      );
      updatedAlerts.set('2', cloneDeep(recoveredAlert1));
      updatedAlerts.set('3', cloneDeep(recoveredAlert2));

      const categorizedAlerts = categorizeAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        autoRecoverAlerts: true,
        startedAt,
      });

      const recoveredAlerts = categorizedAlerts.filter(
        ({ category }) => category === AlertCategory.Recovered
      );
      const recoveredAlertIds = recoveredAlerts.map(({ alert }) => alert.getId());

      expect(recoveredAlertIds).toEqual(['2', '3']);

      const recoveredAlert1State = recoveredAlerts[0].alert.getState();
      const recoveredAlert2State = recoveredAlerts[1].alert.getState();

      expect(recoveredAlert1State.start).not.toBeDefined();
      expect(recoveredAlert2State.start).not.toBeDefined();

      expect(recoveredAlert1State.duration).not.toBeDefined();
      expect(recoveredAlert2State.duration).not.toBeDefined();

      expect(recoveredAlert1State.end).not.toBeDefined();
      expect(recoveredAlert2State.end).not.toBeDefined();
    });

    test('should skip recovery calculations if autoRecoverAlerts = false', () => {
      const activeAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const recoveredAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('2', {
        state: { start: '1969-12-30T00:00:00.000Z', duration: 33000 },
      });
      const recoveredAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('3', {
        state: { start: '1969-12-31T07:34:00.000Z', duration: 23532 },
      });

      const existingAlerts = new Map();
      existingAlerts.set('1', activeAlert);
      existingAlerts.set('2', recoveredAlert1);
      existingAlerts.set('3', recoveredAlert2);

      const updatedAlerts = new Map();
      updatedAlerts.set(
        '1',
        cloneDeep(activeAlert).scheduleActions('default' as never, { foo: '1' })
      );
      updatedAlerts.set('2', cloneDeep(recoveredAlert1));
      updatedAlerts.set('3', cloneDeep(recoveredAlert2));

      const categorizedAlerts = categorizeAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        autoRecoverAlerts: false,
        startedAt,
      });

      const recoveredAlertIds = categorizedAlerts
        .filter(({ category }) => category === AlertCategory.Recovered)
        .map(({ alert }) => alert.getId());

      expect(recoveredAlertIds).toEqual([]);
    });
  });
});
