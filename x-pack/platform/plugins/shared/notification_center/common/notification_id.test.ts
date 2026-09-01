/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildTimeseriesNotificationId, buildStateNotificationId } from './notification_id';

describe('buildStateNotificationId', () => {
  it('joins the parts as <namespace>:<type>:<entity>:<state>', () => {
    expect(
      buildStateNotificationId({
        namespace: 'inference',
        type: 'modelStatus',
        entity: 'my-endpoint',
        state: 'deprecated',
      })
    ).toBe('inference:modelStatus:my-endpoint:deprecated');
  });

  it('is deterministic: same parts produce the same id (collapse-friendly)', () => {
    const parts = {
      namespace: 'inference',
      type: 'modelStatus',
      entity: 'my-endpoint',
      state: 'deprecated',
    };
    expect(buildStateNotificationId(parts)).toBe(buildStateNotificationId(parts));
  });

  it('produces a different id when the state changes', () => {
    expect(
      buildStateNotificationId({
        namespace: 'inference',
        type: 'modelStatus',
        entity: 'my-endpoint',
        state: 'deprecated',
      })
    ).not.toBe(
      buildStateNotificationId({
        namespace: 'inference',
        type: 'modelStatus',
        entity: 'my-endpoint',
        state: 'available',
      })
    );
  });

  it('rejects empty segments', () => {
    expect(() =>
      buildStateNotificationId({
        namespace: 'inference',
        type: 'modelStatus',
        entity: '',
        state: 'deprecated',
      })
    ).toThrow(/non-empty/);
  });

  it('rejects segments containing the separator', () => {
    expect(() =>
      buildStateNotificationId({
        namespace: 'inference',
        type: 'modelStatus',
        entity: 'a:b',
        state: 'deprecated',
      })
    ).toThrow(/separator/);
  });
});

describe('buildTimeseriesNotificationId', () => {
  it('joins the parts as <namespace>:<type>:<event>:<epochMs>', () => {
    expect(
      buildTimeseriesNotificationId({
        namespace: 'inference',
        type: 'modelStatus',
        event: 'memoryLimit',
        epochMs: 1750118400000,
      })
    ).toBe('inference:modelStatus:memoryLimit:1750118400000');
  });

  it('produces a unique id per occurrence via the epochMs segment', () => {
    expect(
      buildTimeseriesNotificationId({
        namespace: 'inference',
        type: 'modelStatus',
        event: 'memoryLimit',
        epochMs: 1750118400000,
      })
    ).not.toBe(
      buildTimeseriesNotificationId({
        namespace: 'inference',
        type: 'modelStatus',
        event: 'memoryLimit',
        epochMs: 1750118401000,
      })
    );
  });

  it('rejects empty segments', () => {
    expect(() =>
      buildTimeseriesNotificationId({
        namespace: 'inference',
        type: 'modelStatus',
        event: '',
        epochMs: 1750118400000,
      })
    ).toThrow(/non-empty/);
  });

  it.each([NaN, Infinity, -Infinity])('rejects non-finite epochMs (%s)', (epochMs) => {
    expect(() =>
      buildTimeseriesNotificationId({
        namespace: 'inference',
        type: 'modelStatus',
        event: 'memoryLimit',
        epochMs,
      })
    ).toThrow(/finite/);
  });

  it('rejects segments containing the separator', () => {
    expect(() =>
      buildTimeseriesNotificationId({
        namespace: 'inference',
        type: 'modelStatus',
        event: 'memory:Limit',
        epochMs: 1750118400000,
      })
    ).toThrow(/separator/);
  });
});
