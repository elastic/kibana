/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRelatedAlertEpisodesEsqlQuery } from './related_episodes_query';

describe('buildRelatedAlertEpisodesEsqlQuery', () => {
  it('filters by rule and excludes an episode and keeps pagination variables', () => {
    const q = buildRelatedAlertEpisodesEsqlQuery('rule-a', 'episode-b');
    expect(q).toContain('rule.id == "rule-a"');
    expect(q).toContain('episode.id != "episode-b"');
    expect(q).toContain('?lastEpisodeTimestamp');
    expect(q).toContain('?pageSize');
  });

  it('escapes quotes in ids', () => {
    const q = buildRelatedAlertEpisodesEsqlQuery('a"b', 'c"d');
    expect(q).toContain(String.raw`rule.id == "a\"b"`);
    expect(q).toContain(String.raw`episode.id != "c\"d"`);
  });
});
