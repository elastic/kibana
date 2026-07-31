/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertEpisodesEnrichedViewDefinition } from './alert_episodes_enriched';

describe('getAlertEpisodesEnrichedViewDefinition', () => {
  it('space-keys action and episode INLINE STATS so joins do not cross spaces', () => {
    const { query } = getAlertEpisodesEnrichedViewDefinition();

    expect(query).toContain('BY group_hash, space_id');
    expect(query).toContain('BY episode_id, space_id');
    expect(query).toContain('BY `episode.id`, space_id');
    expect(query).not.toMatch(/BY group_hash\s*$/m);
    // QSTR after FROM fails if the view ends with SORT.
    expect(query).not.toContain('SORT');
  });
});
