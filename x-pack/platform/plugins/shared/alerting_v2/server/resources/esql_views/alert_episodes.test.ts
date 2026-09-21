/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertEpisodesViewDefinition } from './alert_episodes';

describe('getAlertEpisodesViewDefinition', () => {
  it('bounds the INLINE STATS aggregation with a lookback filter applied first', () => {
    const { query } = getAlertEpisodesViewDefinition();

    const lookbackIndex = query.indexOf('WHERE @timestamp > NOW() - 90 days');
    const inlineStatsIndex = query.indexOf('INLINE STATS');

    expect(lookbackIndex).toBeGreaterThan(-1);
    expect(inlineStatsIndex).toBeGreaterThan(-1);
    // The lookback must run before the aggregation to bound the scan.
    expect(lookbackIndex).toBeLessThan(inlineStatsIndex);
  });
});
