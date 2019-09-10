/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertInstance } from './alert_instance';

describe('hasBeenEnqueued()', () => {
  test('defaults to false', () => {
    const alertInstance = new AlertInstance();
    expect(alertInstance.hasBeenEnqueued()).toEqual(false);
  });
});

describe('getEnqueuedFiringOptions()', () => {
  test('defaults to undefined', () => {
    const alertInstance = new AlertInstance();
    expect(alertInstance.getEnqueuedFiringOptions()).toBeUndefined();
  });
});

describe('dequeue()', () => {
  test('makes hasBeenEnqueued() return false', () => {
    const alertInstance = new AlertInstance();
    alertInstance.enqueue('default');
    expect(alertInstance.hasBeenEnqueued()).toEqual(true);
    alertInstance.dequeue();
    expect(alertInstance.hasBeenEnqueued()).toEqual(false);
  });

  test('makes getEnqueuedFiringOptions() return undefined', () => {
    const alertInstance = new AlertInstance();
    alertInstance.enqueue('default');
    expect(alertInstance.getEnqueuedFiringOptions()).toEqual({
      actionGroup: 'default',
      context: {},
      state: {},
    });
    alertInstance.dequeue();
    expect(alertInstance.getEnqueuedFiringOptions()).toBeUndefined();
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

describe('enqueue()', () => {
  test('makes hasBeenEnqueued() return true', () => {
    const alertInstance = new AlertInstance({ state: { foo: true }, meta: { bar: true } });
    alertInstance.replaceState({ otherField: true }).enqueue('default', { field: true });
    expect(alertInstance.hasBeenEnqueued()).toEqual(true);
  });

  test('makes getEnqueuedFiringOptions() return given options', () => {
    const alertInstance = new AlertInstance({ state: { foo: true }, meta: { bar: true } });
    alertInstance.replaceState({ otherField: true }).enqueue('default', { field: true });
    expect(alertInstance.getEnqueuedFiringOptions()).toEqual({
      actionGroup: 'default',
      context: { field: true },
      state: { otherField: true },
    });
  });

  test('cannot enqueue for firing twice', () => {
    const alertInstance = new AlertInstance();
    alertInstance.enqueue('default', { field: true });
    expect(() =>
      alertInstance.enqueue('default', { field: false })
    ).toThrowErrorMatchingInlineSnapshot(
      `"Alert instance has already been enqueued to be fired, cannot enqueue twice"`
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
