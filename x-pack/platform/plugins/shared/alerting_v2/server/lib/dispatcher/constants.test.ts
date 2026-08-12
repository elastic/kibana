/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_WINDOW_MINUTES, OVERLAP_WINDOW_MINUTES } from './constants';
import { EPISODE_QUERY_LIMIT } from './queries';

describe('dispatcher constants invariants', () => {
  it('MAX_WINDOW_MINUTES is strictly greater than OVERLAP_WINDOW_MINUTES (forward-progress guarantee)', () => {
    expect(MAX_WINDOW_MINUTES).toBeGreaterThan(OVERLAP_WINDOW_MINUTES);
  });

  it('EPISODE_QUERY_LIMIT matches the LIMIT literal in getDispatchableAlertEventsQuery', async () => {
    // Dynamically import to keep the assertion co-located without a cross-file import cycle.
    const { getDispatchableAlertEventsQuery } = await import('./queries');
    const { query } = getDispatchableAlertEventsQuery();

    expect(query).toContain(`LIMIT ${EPISODE_QUERY_LIMIT}`);
  });
});
