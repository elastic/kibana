/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EVENTS_DATA_STREAM, TIME_FIELD } from '../constants';
import {
  buildRelatedBaseQuery,
  finishRelatedEpisodesQuery,
  RELATED_EPISODE_FIELDS,
} from './related_episodes_query';

describe('buildRelatedBaseQuery', () => {
  it('selects from the alert events stream, filters by rule and excludes an episode', () => {
    const queryString = buildRelatedBaseQuery('rule-a', 'episode-b').print('basic');

    expect(queryString).toContain(ALERT_EVENTS_DATA_STREAM);
    expect(queryString).toContain('METADATA');
    expect(queryString).toContain('_source');
    expect(queryString).toContain('type == "alert"');
    expect(queryString).toContain('rule.id');
    expect(queryString).toContain('rule-a');
    expect(queryString).toContain('episode.id');
    expect(queryString).toContain('episode-b');
    expect(queryString).toMatch(/!=/);
  });

  it('escapes quotes in ids', () => {
    const queryString = buildRelatedBaseQuery('a"b', 'c"d').print('basic');

    expect(queryString).toContain('rule.id');
    expect(queryString).toContain('episode.id');
    expect(queryString).toContain(String.raw`a\"b`);
    expect(queryString).toContain(String.raw`c\"d`);
  });
});

describe('finishRelatedEpisodesQuery', () => {
  it('adds episode aggregation, sort, fixed limit, and keep columns', () => {
    const queryString = finishRelatedEpisodesQuery(
      buildRelatedBaseQuery('rule-a', 'episode-b')
    ).print('basic');

    expect(queryString).toContain('MIN(@timestamp)');
    expect(queryString).toContain('MAX(@timestamp)');
    expect(queryString).toContain(TIME_FIELD);
    expect(queryString).toMatch(/sort.*desc/i);
    expect(queryString).toContain('LIMIT 5');
    for (const field of RELATED_EPISODE_FIELDS) {
      expect(queryString).toContain(field);
    }
  });
});
