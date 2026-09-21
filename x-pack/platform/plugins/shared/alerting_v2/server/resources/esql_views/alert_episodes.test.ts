/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertsV2ViewDefinition, getAlertEpisodesViewDefinition } from './alert_episodes';

describe('getAlertsV2ViewDefinition', () => {
  it('bounds the INLINE STATS aggregation with a lookback filter applied first', () => {
    const { query } = getAlertsV2ViewDefinition();

    const lookbackIndex = query.indexOf('WHERE @timestamp > NOW() - 90 days');
    const inlineStatsIndex = query.indexOf('INLINE STATS');

    expect(lookbackIndex).toBeGreaterThan(-1);
    expect(inlineStatsIndex).toBeGreaterThan(-1);
    // The lookback must run before the aggregation to bound the scan.
    expect(lookbackIndex).toBeLessThan(inlineStatsIndex);
  });

  it('reads alert.id from the mapping (not the deprecated episode.id)', () => {
    const { query } = getAlertsV2ViewDefinition();
    expect(query).toContain('alert.id');
    expect(query).not.toContain('episode.id');
  });

  it('registers as $.alerts-v2', () => {
    expect(getAlertsV2ViewDefinition().name).toBe('$.alerts-v2');
  });
});

describe('getAlertEpisodesViewDefinition (deprecated alias)', () => {
  it('uses the same query body as $.alerts-v2', () => {
    expect(getAlertEpisodesViewDefinition().query).toBe(getAlertsV2ViewDefinition().query);
  });

  it('registers as $.alert-episodes', () => {
    expect(getAlertEpisodesViewDefinition().name).toBe('$.alert-episodes');
  });
});
