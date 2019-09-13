/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertInstance } from './alert_instance';

describe('hasScheduledActions()', () => {
  test('defaults to false', () => {
    const alertInstance = new AlertInstance();
    expect(alertInstance.hasScheduledActions()).toEqual(false);
  });
});

describe('getSechduledActionOptions()', () => {
  test('defaults to undefined', () => {
    const alertInstance = new AlertInstance();
    expect(alertInstance.getSechduledActionOptions()).toBeUndefined();
  });
});

describe('unscheduleActions()', () => {
  test('makes hasScheduledActions() return false', () => {
    const alertInstance = new AlertInstance();
    alertInstance.scheduleActions('default');
    expect(alertInstance.hasScheduledActions()).toEqual(true);
    alertInstance.unscheduleActions();
    expect(alertInstance.hasScheduledActions()).toEqual(false);
  });

  test('makes getSechduledActionOptions() return undefined', () => {
    const alertInstance = new AlertInstance();
    alertInstance.scheduleActions('default');
    expect(alertInstance.getSechduledActionOptions()).toEqual({
      actionGroup: 'default',
      context: {},
      state: {},
    });
    alertInstance.unscheduleActions();
    expect(alertInstance.getSechduledActionOptions()).toBeUndefined();
  });
});

describe('getState()', () => {
  test('returns state passed to constructor', () => {
    const state = { foo: true };
    const alertInstance = new AlertInstance({ state });
    expect(alertInstance.getState()).toEqual(state);
  });
});

describe('getMeta()', () => {
  test('returns meta passed to constructor', () => {
    const meta = { bar: true };
    const alertInstance = new AlertInstance({ meta });
    expect(alertInstance.getMeta()).toEqual(meta);
  });
});

describe('scheduleActions()', () => {
  test('makes hasScheduledActions() return true', () => {
    const alertInstance = new AlertInstance({ state: { foo: true }, meta: { bar: true } });
    alertInstance.replaceState({ otherField: true }).scheduleActions('default', { field: true });
    expect(alertInstance.hasScheduledActions()).toEqual(true);
  });

  test('makes getSechduledActionOptions() return given options', () => {
    const alertInstance = new AlertInstance({ state: { foo: true }, meta: { bar: true } });
    alertInstance.replaceState({ otherField: true }).scheduleActions('default', { field: true });
    expect(alertInstance.getSechduledActionOptions()).toEqual({
      actionGroup: 'default',
      context: { field: true },
      state: { otherField: true },
    });
  });

  test('cannot schdule for execution twice', () => {
    const alertInstance = new AlertInstance();
    alertInstance.scheduleActions('default', { field: true });
    expect(() =>
      alertInstance.scheduleActions('default', { field: false })
    ).toThrowErrorMatchingInlineSnapshot(
      `"Alert instance execution has already been scheduled, cannot schedule twice"`
    );
  });
});

describe('replaceState()', () => {
  test('replaces previous state', () => {
    const alertInstance = new AlertInstance({ state: { foo: true } });
    alertInstance.replaceState({ bar: true });
    expect(alertInstance.getState()).toEqual({ bar: true });
    alertInstance.replaceState({ baz: true });
    expect(alertInstance.getState()).toEqual({ baz: true });
  });
});

describe('replaceMeta()', () => {
  test('replaces previous meta', () => {
    const alertInstance = new AlertInstance({ meta: { foo: true } });
    alertInstance.replaceMeta({ bar: true });
    expect(alertInstance.getMeta()).toEqual({ bar: true });
    alertInstance.replaceMeta({ baz: true });
    expect(alertInstance.getMeta()).toEqual({ baz: true });
  });
});

describe('toJSON', () => {
  test('only serializes state and meta', () => {
    const alertInstance = new AlertInstance({
      state: { foo: true },
      meta: { bar: true },
    });
    expect(JSON.stringify(alertInstance)).toEqual('{"state":{"foo":true},"meta":{"bar":true}}');
  });
});
