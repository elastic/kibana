/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRelatedAlertEpisodesEsqlQuery } from './related_episodes_query';

describe('buildRelatedAlertEpisodesEsqlQuery', () => {
  it('filters by rule and excludes an episode and applies a fixed page size', () => {
    const queryString = buildRelatedAlertEpisodesEsqlQuery('rule-a', 'episode-b').print('basic');

    expect(queryString).toContain('rule.id');
    expect(queryString).toContain('rule-a');
    expect(queryString).toContain('episode.id');
    expect(queryString).toContain('episode-b');
    expect(queryString).toMatch(/!=/);
    expect(queryString).toContain('LIMIT 5');
  });

  it('escapes quotes in ids', () => {
    const queryString = buildRelatedAlertEpisodesEsqlQuery('a"b', 'c"d').print('basic');

    expect(queryString).toContain('rule.id');
    expect(queryString).toContain('episode.id');
    expect(queryString).toContain(String.raw`a\"b`);
    expect(queryString).toContain(String.raw`c\"d`);
  });
});
