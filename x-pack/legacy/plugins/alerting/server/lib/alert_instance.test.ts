/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import { AlertInstance } from './alert_instance';

let clock: sinon.SinonFakeTimers;

beforeAll(() => {
  clock = sinon.useFakeTimers();
});
beforeEach(() => clock.reset());
afterAll(() => clock.restore());

describe('shouldFire()', () => {
  test('defaults to false', () => {
    const alertInstance = new AlertInstance();
    expect(alertInstance.shouldFire()).toEqual(false);
  });

  test(`should throttle when group didn't change and throttle period is still active`, () => {
    const alertInstance = new AlertInstance({
      meta: {
        lastFired: {
          epocTime: Date.now(),
          group: 'default',
        },
      },
    });
    clock.tick(30000);
    alertInstance.fire('default');
    expect(alertInstance.shouldFire('1m')).toEqual(false);
  });

  test(`shouldn't throttle when group didn't change and throttle period expired`, () => {
    const alertInstance = new AlertInstance({
      meta: {
        lastFired: {
          epocTime: Date.now(),
          group: 'default',
        },
      },
    });
    clock.tick(30000);
    alertInstance.fire('default');
    expect(alertInstance.shouldFire('15s')).toEqual(true);
  });

  test(`shouldn't throttle when group changes`, () => {
    const alertInstance = new AlertInstance({
      meta: {
        lastFired: {
          epocTime: Date.now(),
          group: 'default',
        },
      },
    });
    clock.tick(5000);
    alertInstance.fire('other-group');
    expect(alertInstance.shouldFire('1m')).toEqual(true);
  });
});

describe('getFireOptions()', () => {
  test('defaults to undefined', () => {
    const alertInstance = new AlertInstance();
    expect(alertInstance.getFireOptions()).toBeUndefined();
  });
});

describe('resetFire()', () => {
  test('makes shouldFire() return false', () => {
    const alertInstance = new AlertInstance();
    alertInstance.fire('default');
    expect(alertInstance.shouldFire()).toEqual(true);
    alertInstance.resetFire();
    expect(alertInstance.shouldFire()).toEqual(false);
  });

  test('makes getFireOptions() return undefined', () => {
    const alertInstance = new AlertInstance();
    alertInstance.fire('default');
    expect(alertInstance.getFireOptions()).toEqual({
      actionGroup: 'default',
      context: {},
      state: {},
    });
    alertInstance.resetFire();
    expect(alertInstance.getFireOptions()).toBeUndefined();
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
    const meta = {};
    const alertInstance = new AlertInstance({ meta });
    expect(alertInstance.getMeta()).toEqual(meta);
  });
});

describe('fire()', () => {
  test('makes shouldFire() return true', () => {
    const alertInstance = new AlertInstance({
      state: { foo: true },
      meta: {
        lastFired: {
          epocTime: Date.now(),
          group: 'default',
        },
      },
    });
    alertInstance.replaceState({ otherField: true }).fire('default', { field: true });
    expect(alertInstance.shouldFire()).toEqual(true);
  });

  test('makes shouldFire() return false when throttled', () => {
    const alertInstance = new AlertInstance({
      state: { foo: true },
      meta: {
        lastFired: {
          epocTime: Date.now(),
          group: 'default',
        },
      },
    });
    alertInstance.replaceState({ otherField: true }).fire('default', { field: true });
    expect(alertInstance.shouldFire('1m')).toEqual(false);
  });

  test('make shouldFire() return true when throttled expired', () => {
    const alertInstance = new AlertInstance({
      state: { foo: true },
      meta: {
        lastFired: {
          epocTime: Date.now(),
          group: 'default',
        },
      },
    });
    clock.tick(120000);
    alertInstance.replaceState({ otherField: true }).fire('default', { field: true });
    expect(alertInstance.shouldFire('1m')).toEqual(true);
  });

  test('makes getFireOptions() return given options', () => {
    const alertInstance = new AlertInstance({ state: { foo: true }, meta: {} });
    alertInstance.replaceState({ otherField: true }).fire('default', { field: true });
    expect(alertInstance.getFireOptions()).toEqual({
      actionGroup: 'default',
      context: { field: true },
      state: { otherField: true },
    });
  });

  test('cannot fire twice', () => {
    const alertInstance = new AlertInstance();
    alertInstance.fire('default', { field: true });
    expect(() =>
      alertInstance.fire('default', { field: false })
    ).toThrowErrorMatchingInlineSnapshot(`"Alert instance already fired, cannot fire twice"`);
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
    const alertInstance = new AlertInstance({ meta: {} });
    expect(alertInstance.getMeta()).toEqual({});
    alertInstance.replaceMeta({
      lastFired: {
        epocTime: Date.now(),
        group: 'default',
      },
    });
    expect(alertInstance.getMeta()).toEqual({
      lastFired: {
        epocTime: Date.now(),
        group: 'default',
      },
    });
  });
});

describe('toJSON', () => {
  test('only serializes state and meta', () => {
    const alertInstance = new AlertInstance({
      state: { foo: true },
      meta: {
        lastFired: {
          epocTime: Date.now(),
          group: 'default',
        },
      },
    });
    expect(JSON.stringify(alertInstance)).toEqual(
      '{"state":{"foo":true},"meta":{"lastFired":{"epocTime":0,"group":"default"}}}'
    );
  });
});

describe('isResolved', () => {
  test('returns true by default', () => {
    const alertInstance = new AlertInstance({
      state: { foo: true },
      meta: {},
    });
    expect(alertInstance.isResolved()).toEqual(true);
  });

  test('returns false when fired', () => {
    const alertInstance = new AlertInstance({
      state: { foo: true },
      meta: {},
    });
    alertInstance.fire('default');
    expect(alertInstance.isResolved()).toEqual(false);
  });

  test(`returns true when some groups are still throttled but didn't fire`, () => {
    const alertInstance = new AlertInstance({
      state: { foo: true },
      meta: {
        lastFired: {
          epocTime: Date.now(),
          group: 'default',
        },
      },
    });
    expect(alertInstance.isResolved('1m')).toEqual(true);
  });

  test(`returns true when throttle is expired and didn't fire`, () => {
    const alertInstance = new AlertInstance({
      state: { foo: true },
      meta: {
        lastFired: {
          epocTime: Date.now(),
          group: 'default',
        },
      },
    });
    clock.tick(120000);
    expect(alertInstance.isResolved('1m')).toEqual(true);
  });
});
