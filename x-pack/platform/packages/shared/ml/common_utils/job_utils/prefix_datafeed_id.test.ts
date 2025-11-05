/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { prefixDatafeedId } from './prefix_datafeed_id';

describe('prefixDatafeedId', () => {
  test('returns datafeed-prefix-job from datafeed-job"', () => {
    expect(prefixDatafeedId('datafeed-job', 'prefix-')).toBe('datafeed-prefix-job');
  });

  test('returns datafeed-prefix-job from job"', () => {
    expect(prefixDatafeedId('job', 'prefix-')).toBe('datafeed-prefix-job');
  });
});
