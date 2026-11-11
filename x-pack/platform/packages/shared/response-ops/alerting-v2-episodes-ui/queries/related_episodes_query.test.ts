/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_EVENTS_DATA_STREAM,
  DEFAULT_TIME_FIELD as TIME_FIELD,
} from '@kbn/alerting-v2-constants';
import {
  buildRelatedBaseQuery,
  finishRelatedEpisodesQuery,
  RELATED_EPISODE_FIELDS,
  getRelatedEpisodesScope,
  getRelatedEpisodesScopeKey,
  type RelatedEpisodesScope,
} from './related_episodes_query';

const SPACE_ID = 'default';
const RULE_SCOPE: RelatedEpisodesScope = { type: 'rule', ruleId: 'rule-a' };

describe('buildRelatedBaseQuery', () => {
  it('selects from the alert events stream, filters by rule and excludes an episode', () => {
    const queryString = buildRelatedBaseQuery(SPACE_ID, RULE_SCOPE, 'episode-b').print('basic');

    expect(queryString).toContain(ALERT_EVENTS_DATA_STREAM);
    expect(queryString).not.toContain('_source');
    expect(queryString).toContain('type == "alert"');
    expect(queryString).toContain('rule.id');
    expect(queryString).toContain('rule-a');
    expect(queryString).toContain('episode.id');
    expect(queryString).toContain('episode-b');
    expect(queryString).toMatch(/!=/);
  });

  it('filters by source instead of rule for a source scope', () => {
    const queryString = buildRelatedBaseQuery(
      SPACE_ID,
      { type: 'source', source: 'zabbix' },
      'episode-b'
    ).print('basic');

    expect(queryString).toContain('space_id');
    expect(queryString).toContain('type == "alert"');
    expect(queryString).toContain('source == "zabbix"');
    expect(queryString).toContain('episode.id != "episode-b"');
    expect(queryString).not.toContain('rule.id');
  });

  it('escapes quotes in ids', () => {
    const queryString = buildRelatedBaseQuery(
      SPACE_ID,
      { type: 'rule', ruleId: 'a"b' },
      'c"d'
    ).print('basic');

    expect(queryString).toContain('rule.id');
    expect(queryString).toContain('episode.id');
    expect(queryString).toContain(String.raw`a\"b`);
    expect(queryString).toContain(String.raw`c\"d`);
  });
});

describe('finishRelatedEpisodesQuery', () => {
  it('adds the episode summary stats, sort, fixed limit, and keep columns', () => {
    const queryString = finishRelatedEpisodesQuery(
      buildRelatedBaseQuery(SPACE_ID, RULE_SCOPE, 'episode-b')
    ).print('basic');

    expect(queryString).not.toContain('INLINE STATS');
    expect(queryString).not.toContain('JSON_EXTRACT');
    expect(queryString).toContain('STATS last_timestamp = MAX(@timestamp)');
    expect(queryString).toContain('first_timestamp = MIN(@timestamp)');
    expect(queryString).toContain('BY `episode.id`');
    expect(queryString.indexOf('LIMIT 5')).toBeGreaterThan(queryString.indexOf('STATS'));
    expect(queryString).toContain(TIME_FIELD);
    expect(queryString).toMatch(/sort.*desc/i);
    expect(queryString).toContain('LIMIT 5');
    for (const field of RELATED_EPISODE_FIELDS) {
      expect(queryString).toContain(field);
    }
  });
});

describe('getRelatedEpisodesScope', () => {
  it('prefers the rule over the source', () => {
    expect(getRelatedEpisodesScope({ ruleId: 'rule-a', source: 'zabbix' })).toEqual({
      type: 'rule',
      ruleId: 'rule-a',
    });
  });

  it('falls back to the source when there is no rule', () => {
    expect(getRelatedEpisodesScope({ ruleId: undefined, source: 'zabbix' })).toEqual({
      type: 'source',
      source: 'zabbix',
    });
    expect(getRelatedEpisodesScope({ ruleId: null, source: 'zabbix' })).toEqual({
      type: 'source',
      source: 'zabbix',
    });
  });

  it('has no scope without a rule or a source', () => {
    expect(getRelatedEpisodesScope({ ruleId: undefined, source: undefined })).toBeUndefined();
  });
});

describe('getRelatedEpisodesScopeKey', () => {
  it('keeps a rule and a source with the same value apart', () => {
    expect(getRelatedEpisodesScopeKey({ type: 'rule', ruleId: 'x' })).not.toBe(
      getRelatedEpisodesScopeKey({ type: 'source', source: 'x' })
    );
  });
});
