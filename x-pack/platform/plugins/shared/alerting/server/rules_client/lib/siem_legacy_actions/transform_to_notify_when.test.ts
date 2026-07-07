/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformToNotifyWhen } from './transform_to_notify_when';

describe('transformToNotifyWhen', () => {
  it('should return null when throttle is null OR no_actions', () => {
    expect(transformToNotifyWhen(null)).toBeNull();
    expect(transformToNotifyWhen('no_actions')).toBeNull();
  });
  it('should return onActiveAlert when throttle is rule', () => {
    expect(transformToNotifyWhen('rule')).toBe('onActiveAlert');
  });
  it('should return onThrottleInterval for other throttle values', () => {
    expect(transformToNotifyWhen('1h')).toBe('onThrottleInterval');
    expect(transformToNotifyWhen('1m')).toBe('onThrottleInterval');
    expect(transformToNotifyWhen('1d')).toBe('onThrottleInterval');
  });
});
