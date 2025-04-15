/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { cloneDeep } from 'lodash';
import { processAlerts } from './process_alerts';
import { Alert } from '../alert';
import type { AlertInstanceState, AlertInstanceContext } from '../types';

describe('processAlerts', () => {
  let clock: sinon.SinonFakeTimers;

  beforeAll(() => {
    clock = sinon.useFakeTimers();
  });

  beforeEach(() => {
    clock.reset();
  });

  afterAll(() => clock.restore());

  describe('newAlerts', () => {
    test('considers alert new if it has scheduled actions and its id is not in originalAlertIds or previouslyRecoveredAlertIds list', () => {
      const newAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const existingAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
      const existingAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('3', {});

      const existingAlerts = {
        '2': existingAlert1,
        '3': existingAlert2,
      };

      const updatedAlerts = {
        ...cloneDeep(existingAlerts),
        '1': newAlert,
      };

      updatedAlerts['1'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['2'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['3'].scheduleActions('default' as never, { foo: '2' });

      const { newAlerts } = processAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        hasReachedAlertLimit: false,
        alertLimit: 10,
        autoRecoverAlerts: true,
      });

      expect(newAlerts).toEqual({ '1': newAlert });
    });

    test('sets start time in new alert state', () => {
      const newAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const newAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
      const existingAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('3');
      const existingAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('4');

      const existingAlerts = {
        '3': existingAlert1,
        '4': existingAlert2,
      };

      const updatedAlerts = {
        ...cloneDeep(existingAlerts),
        '1': newAlert1,
        '2': newAlert2,
      };

      updatedAlerts['1'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['2'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['3'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['4'].scheduleActions('default' as never, { foo: '2' });

      expect(newAlert1.getState()).toStrictEqual({});
      expect(newAlert2.getState()).toStrictEqual({});

      const { newAlerts } = processAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        hasReachedAlertLimit: false,
        alertLimit: 10,
        autoRecoverAlerts: true,
      });

      expect(newAlerts).toEqual({ '1': newAlert1, '2': newAlert2 });

      const newAlert1State = newAlerts['1'].getState();
      const newAlert2State = newAlerts['2'].getState();

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

      const existingAlerts = {
        '3': existingAlert1,
        '4': existingAlert2,
      };

      const updatedAlerts = {
        ...cloneDeep(existingAlerts),
        '1': newAlert1,
        '2': newAlert2,
      };

      updatedAlerts['1'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['2'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['3'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['4'].scheduleActions('default' as never, { foo: '2' });

      expect(newAlert1.getState()).toStrictEqual({});
      expect(newAlert2.getState()).toStrictEqual({});

      const { newAlerts } = processAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        hasReachedAlertLimit: false,
        alertLimit: 10,
        autoRecoverAlerts: true,
        startedAt: '2023-10-03T20:03:08.716Z',
      });

      expect(newAlerts).toEqual({ '1': newAlert1, '2': newAlert2 });

      const newAlert1State = newAlerts['1'].getState();
      const newAlert2State = newAlerts['2'].getState();

      expect(newAlert1State.start).toEqual('2023-10-03T20:03:08.716Z');
      expect(newAlert2State.start).toEqual('2023-10-03T20:03:08.716Z');

      expect(newAlert1State.duration).toEqual('0');
      expect(newAlert2State.duration).toEqual('0');

      expect(newAlert1State.end).not.toBeDefined();
      expect(newAlert2State.end).not.toBeDefined();
    });
  });

  describe('activeAlerts', () => {
    test('considers alert active if it has scheduled actions', () => {
      const newAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const existingAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
      const existingAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('3');

      const existingAlerts = {
        '2': existingAlert1,
        '3': existingAlert2,
      };

      const updatedAlerts = {
        ...cloneDeep(existingAlerts),
        '1': newAlert,
      };

      updatedAlerts['1'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['2'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['3'].scheduleActions('default' as never, { foo: '2' });

      const { activeAlerts } = processAlerts({
        alerts: updatedAlerts,
        existingAlerts,

        hasReachedAlertLimit: false,
        alertLimit: 10,
        autoRecoverAlerts: true,
      });

      expect(activeAlerts).toEqual({
        '1': updatedAlerts['1'],
        '2': updatedAlerts['2'],
        '3': updatedAlerts['3'],
      });
    });

    test('updates duration in active alerts if start is available', () => {
      const newAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const existingAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
      const existingAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('3');

      const existingAlerts = {
        '2': existingAlert1,
        '3': existingAlert2,
      };
      existingAlerts['2'].replaceState({ start: '1969-12-30T00:00:00.000Z', duration: 33000 });
      existingAlerts['3'].replaceState({ start: '1969-12-31T07:34:00.000Z', duration: 23532 });

      const updatedAlerts = {
        ...cloneDeep(existingAlerts),
        '1': newAlert,
      };

      updatedAlerts['1'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['2'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['3'].scheduleActions('default' as never, { foo: '2' });

      const { activeAlerts } = processAlerts({
        alerts: updatedAlerts,
        existingAlerts,

        hasReachedAlertLimit: false,
        alertLimit: 10,
        autoRecoverAlerts: true,
      });

      expect(activeAlerts).toEqual({
        '1': updatedAlerts['1'],
        '2': updatedAlerts['2'],
        '3': updatedAlerts['3'],
      });

      const activeAlert1State = activeAlerts['2'].getState();
      const activeAlert2State = activeAlerts['3'].getState();

      expect(activeAlert1State.start).toEqual('1969-12-30T00:00:00.000Z');
      expect(activeAlert2State.start).toEqual('1969-12-31T07:34:00.000Z');

      expect(activeAlert1State.duration).toEqual('172800000000000');
      expect(activeAlert2State.duration).toEqual('59160000000000');

      expect(activeAlert1State.end).not.toBeDefined();
      expect(activeAlert2State.end).not.toBeDefined();
    });

    test('does not update duration in active alerts if start is not available', () => {
      const newAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const existingAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
      const existingAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('3');

      const existingAlerts = {
        '2': existingAlert1,
        '3': existingAlert2,
      };

      const updatedAlerts = {
        ...cloneDeep(existingAlerts),
        '1': newAlert,
      };

      updatedAlerts['1'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['2'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['3'].scheduleActions('default' as never, { foo: '2' });

      const { activeAlerts } = processAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        hasReachedAlertLimit: false,
        alertLimit: 10,
        autoRecoverAlerts: true,
      });

      expect(activeAlerts).toEqual({
        '1': updatedAlerts['1'],
        '2': updatedAlerts['2'],
        '3': updatedAlerts['3'],
      });

      const activeAlert1State = activeAlerts['2'].getState();
      const activeAlert2State = activeAlerts['3'].getState();

      expect(activeAlert1State.start).not.toBeDefined();
      expect(activeAlert2State.start).not.toBeDefined();

      expect(activeAlert1State.duration).not.toBeDefined();
      expect(activeAlert2State.duration).not.toBeDefined();

      expect(activeAlert1State.end).not.toBeDefined();
      expect(activeAlert2State.end).not.toBeDefined();
    });

    test('preserves other state fields', () => {
      const newAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const existingAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
      const existingAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('3');

      const existingAlerts = {
        '2': existingAlert1,
        '3': existingAlert2,
      };
      existingAlerts['2'].replaceState({
        stateField1: 'xyz',
        start: '1969-12-30T00:00:00.000Z',
        duration: 33000,
      });
      existingAlerts['3'].replaceState({
        anotherState: true,
        start: '1969-12-31T07:34:00.000Z',
        duration: 23532,
      });

      const updatedAlerts = {
        ...cloneDeep(existingAlerts),
        '1': newAlert,
      };

      updatedAlerts['1'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['2'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['3'].scheduleActions('default' as never, { foo: '2' });

      const { activeAlerts } = processAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        hasReachedAlertLimit: false,
        alertLimit: 10,
        autoRecoverAlerts: true,
      });

      expect(activeAlerts).toEqual({
        '1': updatedAlerts['1'],
        '2': updatedAlerts['2'],
        '3': updatedAlerts['3'],
      });

      const activeAlert1State = activeAlerts['2'].getState();
      const activeAlert2State = activeAlerts['3'].getState();

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
      const existingAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
      const existingAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('3');

      const existingAlerts = {
        '2': existingAlert1,
        '3': existingAlert2,
      };
      existingAlerts['2'].replaceState({
        stateField1: 'xyz',
        start: '1969-12-30T00:00:00.000Z',
        duration: 33000,
      });
      existingAlerts['3'].replaceState({
        anotherState: true,
        start: '1969-12-31T07:34:00.000Z',
        duration: 23532,
      });

      const updatedAlerts = {
        ...cloneDeep(existingAlerts),
        '1': newAlert,
      };

      updatedAlerts['1'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['2']
        .scheduleActions('default' as never, { foo: '1' })
        .replaceState({ stateField1: 'abc' });
      updatedAlerts['3']
        .scheduleActions('default' as never, { foo: '2' })
        .replaceState({ anotherState: false });

      const { activeAlerts } = processAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        hasReachedAlertLimit: false,
        alertLimit: 10,
        autoRecoverAlerts: true,
      });

      expect(activeAlerts).toEqual({
        '1': updatedAlerts['1'],
        '2': updatedAlerts['2'],
        '3': updatedAlerts['3'],
      });

      const activeAlert1State = activeAlerts['2'].getState();
      const activeAlert2State = activeAlerts['3'].getState();

      expect(activeAlert1State.start).toEqual('1969-12-30T00:00:00.000Z');
      expect(activeAlert2State.start).toEqual('1969-12-31T07:34:00.000Z');

      expect(activeAlert1State.stateField1).toEqual('abc');
      expect(activeAlert2State.anotherState).toEqual(false);

      expect(activeAlert1State.duration).toEqual('172800000000000');
      expect(activeAlert2State.duration).toEqual('59160000000000');

      expect(activeAlert1State.end).not.toBeDefined();
      expect(activeAlert2State.end).not.toBeDefined();
    });

    test('sets start time in active alert state if alert was previously recovered', () => {
      const previouslyRecoveredAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const previouslyRecoveredAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
      const existingAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('3');
      const existingAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('4');

      const existingAlerts = {
        '3': existingAlert1,
        '4': existingAlert2,
      };

      const previouslyRecoveredAlerts = {
        '1': previouslyRecoveredAlert1,
        '2': previouslyRecoveredAlert2,
      };

      const updatedAlerts = {
        ...cloneDeep(existingAlerts),
        ...cloneDeep(previouslyRecoveredAlerts),
      };

      updatedAlerts['1'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['2'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['3'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['4'].scheduleActions('default' as never, { foo: '2' });

      expect(updatedAlerts['1'].getState()).toStrictEqual({});
      expect(updatedAlerts['2'].getState()).toStrictEqual({});

      const { activeAlerts } = processAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        hasReachedAlertLimit: false,
        alertLimit: 10,
        autoRecoverAlerts: true,
      });

      const previouslyRecoveredAlert1State = activeAlerts['1'].getState();
      const previouslyRecoveredAlert2State = activeAlerts['2'].getState();

      expect(previouslyRecoveredAlert1State.start).toEqual('1970-01-01T00:00:00.000Z');
      expect(previouslyRecoveredAlert2State.start).toEqual('1970-01-01T00:00:00.000Z');

      expect(previouslyRecoveredAlert1State.duration).toEqual('0');
      expect(previouslyRecoveredAlert2State.duration).toEqual('0');

      expect(previouslyRecoveredAlert1State.end).not.toBeDefined();
      expect(previouslyRecoveredAlert2State.end).not.toBeDefined();
    });

    test('sets start time with startedAt in active alert state if alert was previously recovered', () => {
      const previouslyRecoveredAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const previouslyRecoveredAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
      const existingAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('3');
      const existingAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('4');

      const existingAlerts = {
        '3': existingAlert1,
        '4': existingAlert2,
      };

      const previouslyRecoveredAlerts = {
        '1': previouslyRecoveredAlert1,
        '2': previouslyRecoveredAlert2,
      };

      const updatedAlerts = {
        ...cloneDeep(existingAlerts),
        ...cloneDeep(previouslyRecoveredAlerts),
      };

      updatedAlerts['1'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['2'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['3'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['4'].scheduleActions('default' as never, { foo: '2' });

      expect(updatedAlerts['1'].getState()).toStrictEqual({});
      expect(updatedAlerts['2'].getState()).toStrictEqual({});

      const { activeAlerts } = processAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        hasReachedAlertLimit: false,
        alertLimit: 10,
        autoRecoverAlerts: true,
        startedAt: '2023-10-03T20:03:08.716Z',
      });

      const previouslyRecoveredAlert1State = activeAlerts['1'].getState();
      const previouslyRecoveredAlert2State = activeAlerts['2'].getState();

      expect(previouslyRecoveredAlert1State.start).toEqual('2023-10-03T20:03:08.716Z');
      expect(previouslyRecoveredAlert2State.start).toEqual('2023-10-03T20:03:08.716Z');

      expect(previouslyRecoveredAlert1State.duration).toEqual('0');
      expect(previouslyRecoveredAlert2State.duration).toEqual('0');

      expect(previouslyRecoveredAlert1State.end).not.toBeDefined();
      expect(previouslyRecoveredAlert2State.end).not.toBeDefined();
    });
  });

  describe('recoveredAlerts', () => {
    test('considers alert recovered if it has no scheduled actions', () => {
      const activeAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const recoveredAlert = new Alert<AlertInstanceState, AlertInstanceContext>('2');

      const existingAlerts = {
        '1': activeAlert,
        '2': recoveredAlert,
      };

      const updatedAlerts = cloneDeep(existingAlerts);

      updatedAlerts['1'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['2'].setContext({ foo: '2' });

      const { recoveredAlerts } = processAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        hasReachedAlertLimit: false,
        alertLimit: 10,
        autoRecoverAlerts: true,
      });

      expect(recoveredAlerts).toEqual({ '2': updatedAlerts['2'] });
    });

    test('does not consider alert recovered if it has no actions but was not in original alerts list', () => {
      const activeAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const notRecoveredAlert = new Alert<AlertInstanceState, AlertInstanceContext>('2');

      const existingAlerts = {
        '1': activeAlert,
      };

      const updatedAlerts = {
        ...cloneDeep(existingAlerts),
        '2': notRecoveredAlert,
      };

      updatedAlerts['1'].scheduleActions('default' as never, { foo: '1' });

      const { recoveredAlerts } = processAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        hasReachedAlertLimit: false,
        alertLimit: 10,
        autoRecoverAlerts: true,
      });

      expect(recoveredAlerts).toEqual({});
    });

    test('updates duration in recovered alerts if start is available and adds end time', () => {
      const activeAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const recoveredAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
      const recoveredAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('3');

      const existingAlerts = {
        '1': activeAlert,
        '2': recoveredAlert1,
        '3': recoveredAlert2,
      };
      existingAlerts['2'].replaceState({ start: '1969-12-30T00:00:00.000Z', duration: 33000 });
      existingAlerts['3'].replaceState({ start: '1969-12-31T07:34:00.000Z', duration: 23532 });

      const updatedAlerts = cloneDeep(existingAlerts);

      updatedAlerts['1'].scheduleActions('default' as never, { foo: '1' });

      const { recoveredAlerts } = processAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        hasReachedAlertLimit: false,
        alertLimit: 10,
        autoRecoverAlerts: true,
      });

      expect(recoveredAlerts).toEqual({ '2': updatedAlerts['2'], '3': updatedAlerts['3'] });

      const recoveredAlert1State = recoveredAlerts['2'].getState();
      const recoveredAlert2State = recoveredAlerts['3'].getState();

      expect(recoveredAlert1State.start).toEqual('1969-12-30T00:00:00.000Z');
      expect(recoveredAlert2State.start).toEqual('1969-12-31T07:34:00.000Z');

      expect(recoveredAlert1State.duration).toEqual('172800000000000');
      expect(recoveredAlert2State.duration).toEqual('59160000000000');

      expect(recoveredAlert1State.end).toEqual('1970-01-01T00:00:00.000Z');
      expect(recoveredAlert2State.end).toEqual('1970-01-01T00:00:00.000Z');
    });

    test('updates duration in recovered alerts if start is available and adds end time to startedAt if provided', () => {
      const activeAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const recoveredAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
      const recoveredAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('3');

      const existingAlerts = {
        '1': activeAlert,
        '2': recoveredAlert1,
        '3': recoveredAlert2,
      };
      existingAlerts['2'].replaceState({ start: '1969-12-30T00:00:00.000Z', duration: 33000 });
      existingAlerts['3'].replaceState({ start: '1969-12-31T07:34:00.000Z', duration: 23532 });

      const updatedAlerts = cloneDeep(existingAlerts);

      updatedAlerts['1'].scheduleActions('default' as never, { foo: '1' });

      const { recoveredAlerts } = processAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        hasReachedAlertLimit: false,
        alertLimit: 10,
        autoRecoverAlerts: true,

        startedAt: '2023-10-03T20:03:08.716Z',
      });

      expect(recoveredAlerts).toEqual({ '2': updatedAlerts['2'], '3': updatedAlerts['3'] });

      const recoveredAlert1State = recoveredAlerts['2'].getState();
      const recoveredAlert2State = recoveredAlerts['3'].getState();

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

      const existingAlerts = {
        '1': activeAlert,
        '2': recoveredAlert1,
        '3': recoveredAlert2,
      };
      const updatedAlerts = cloneDeep(existingAlerts);

      updatedAlerts['1'].scheduleActions('default' as never, { foo: '1' });

      const { recoveredAlerts } = processAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        hasReachedAlertLimit: false,
        alertLimit: 10,
        autoRecoverAlerts: true,
      });

      expect(recoveredAlerts).toEqual({ '2': updatedAlerts['2'], '3': updatedAlerts['3'] });

      const recoveredAlert1State = recoveredAlerts['2'].getState();
      const recoveredAlert2State = recoveredAlerts['3'].getState();

      expect(recoveredAlert1State.start).not.toBeDefined();
      expect(recoveredAlert2State.start).not.toBeDefined();

      expect(recoveredAlert1State.duration).not.toBeDefined();
      expect(recoveredAlert2State.duration).not.toBeDefined();

      expect(recoveredAlert1State.end).not.toBeDefined();
      expect(recoveredAlert2State.end).not.toBeDefined();
    });

    test('should skip recovery calculations if autoRecoverAlerts = false', () => {
      const activeAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const recoveredAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
      const recoveredAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('3');

      const existingAlerts = {
        '1': activeAlert,
        '2': recoveredAlert1,
        '3': recoveredAlert2,
      };
      existingAlerts['2'].replaceState({ start: '1969-12-30T00:00:00.000Z', duration: 33000 });
      existingAlerts['3'].replaceState({ start: '1969-12-31T07:34:00.000Z', duration: 23532 });

      const updatedAlerts = cloneDeep(existingAlerts);

      updatedAlerts['1'].scheduleActions('default' as never, { foo: '1' });

      const { recoveredAlerts } = processAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        hasReachedAlertLimit: false,
        alertLimit: 10,
        autoRecoverAlerts: false,
      });

      expect(recoveredAlerts).toEqual({});
    });
  });

  describe('when hasReachedAlertLimit is true', () => {
    test('does not calculate recovered alerts', () => {
      const existingAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const existingAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
      const existingAlert3 = new Alert<AlertInstanceState, AlertInstanceContext>('3');
      const existingAlert4 = new Alert<AlertInstanceState, AlertInstanceContext>('4');
      const existingAlert5 = new Alert<AlertInstanceState, AlertInstanceContext>('5');
      const newAlert6 = new Alert<AlertInstanceState, AlertInstanceContext>('6');
      const newAlert7 = new Alert<AlertInstanceState, AlertInstanceContext>('7');

      const existingAlerts = {
        '1': existingAlert1,
        '2': existingAlert2,
        '3': existingAlert3,
        '4': existingAlert4,
        '5': existingAlert5,
      };

      const updatedAlerts = {
        ...cloneDeep(existingAlerts),
        '6': newAlert6,
        '7': newAlert7,
      };

      updatedAlerts['1'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['2'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['3'].scheduleActions('default' as never, { foo: '2' });
      updatedAlerts['4'].scheduleActions('default' as never, { foo: '2' });
      // intentionally not scheduling actions for alert "5"
      updatedAlerts['6'].scheduleActions('default' as never, { foo: '2' });
      updatedAlerts['7'].scheduleActions('default' as never, { foo: '2' });

      const { recoveredAlerts } = processAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        hasReachedAlertLimit: true,
        alertLimit: 7,
        autoRecoverAlerts: true,
      });

      expect(recoveredAlerts).toEqual({});
    });

    test('persists existing alerts', () => {
      const existingAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const existingAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
      const existingAlert3 = new Alert<AlertInstanceState, AlertInstanceContext>('3');
      const existingAlert4 = new Alert<AlertInstanceState, AlertInstanceContext>('4');
      const existingAlert5 = new Alert<AlertInstanceState, AlertInstanceContext>('5');

      const existingAlerts = {
        '1': existingAlert1,
        '2': existingAlert2,
        '3': existingAlert3,
        '4': existingAlert4,
        '5': existingAlert5,
      };

      const updatedAlerts = cloneDeep(existingAlerts);

      updatedAlerts['1'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['2'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['3'].scheduleActions('default' as never, { foo: '2' });
      updatedAlerts['4'].scheduleActions('default' as never, { foo: '2' });
      // intentionally not scheduling actions for alert "5"

      const { activeAlerts } = processAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        hasReachedAlertLimit: true,
        alertLimit: 7,
        autoRecoverAlerts: true,
      });

      expect(activeAlerts).toEqual({
        '1': updatedAlerts['1'],
        '2': updatedAlerts['2'],
        '3': updatedAlerts['3'],
        '4': updatedAlerts['4'],
        '5': existingAlert5,
      });
    });

    test('adds new alerts up to max allowed', () => {
      const MAX_ALERTS = 7;
      const existingAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const existingAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
      const existingAlert3 = new Alert<AlertInstanceState, AlertInstanceContext>('3');
      const existingAlert4 = new Alert<AlertInstanceState, AlertInstanceContext>('4');
      const existingAlert5 = new Alert<AlertInstanceState, AlertInstanceContext>('5');
      const newAlert6 = new Alert<AlertInstanceState, AlertInstanceContext>('6');
      const newAlert7 = new Alert<AlertInstanceState, AlertInstanceContext>('7');
      const newAlert8 = new Alert<AlertInstanceState, AlertInstanceContext>('8');
      const newAlert9 = new Alert<AlertInstanceState, AlertInstanceContext>('9');
      const newAlert10 = new Alert<AlertInstanceState, AlertInstanceContext>('10');

      const existingAlerts = {
        '1': existingAlert1,
        '2': existingAlert2,
        '3': existingAlert3,
        '4': existingAlert4,
        '5': existingAlert5,
      };

      const updatedAlerts = {
        ...cloneDeep(existingAlerts),
        '6': newAlert6,
        '7': newAlert7,
        '8': newAlert8,
        '9': newAlert9,
        '10': newAlert10,
      };

      updatedAlerts['1'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['2'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['3'].scheduleActions('default' as never, { foo: '2' });
      updatedAlerts['4'].scheduleActions('default' as never, { foo: '2' });
      // intentionally not scheduling actions for alert "5"
      updatedAlerts['6'].scheduleActions('default' as never, { foo: '2' });
      updatedAlerts['7'].scheduleActions('default' as never, { foo: '2' });
      updatedAlerts['8'].scheduleActions('default' as never, { foo: '2' });
      updatedAlerts['9'].scheduleActions('default' as never, { foo: '2' });
      updatedAlerts['10'].scheduleActions('default' as never, { foo: '2' });

      const { activeAlerts, newAlerts } = processAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        hasReachedAlertLimit: true,
        alertLimit: MAX_ALERTS,
        autoRecoverAlerts: true,
      });

      expect(Object.keys(activeAlerts).length).toEqual(MAX_ALERTS);
      expect(activeAlerts).toEqual({
        '1': updatedAlerts['1'],
        '2': updatedAlerts['2'],
        '3': updatedAlerts['3'],
        '4': updatedAlerts['4'],
        '5': existingAlert5,
        '6': newAlert6,
        '7': newAlert7,
      });
      expect(newAlerts).toEqual({
        '6': newAlert6,
        '7': newAlert7,
      });
    });
  });
});
