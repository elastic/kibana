/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildSeriesGroupingValuesEsqlQuery,
  parseSeriesGroupingValuesRows,
  type SeriesGroupingValuesRow,
} from './series_grouping_values_query';

const RULE_ID = 'rule-abc';

describe('buildSeriesGroupingValuesEsqlQuery', () => {
  it('scopes to alert events, rule id and the requested group hashes', () => {
    const queryString = buildSeriesGroupingValuesEsqlQuery({
      ruleId: RULE_ID,
      groupHashes: ['gh-1', 'gh-2'],
    }).print('basic');

    expect(queryString).toContain('.rule-events');
    expect(queryString).toContain('type == "alert"');
    expect(queryString).toContain('rule.id');
    expect(queryString).toContain(RULE_ID);
    expect(queryString).toContain('group_hash IN');
    expect(queryString).toContain('gh-1');
    expect(queryString).toContain('gh-2');
  });

  it('reads the flattened data via _source/JSON_EXTRACT and keeps the latest non-empty blob per hash', () => {
    const queryString = buildSeriesGroupingValuesEsqlQuery({
      ruleId: RULE_ID,
      groupHashes: ['gh-1'],
    }).print('basic');

    expect(queryString).toContain('JSON_EXTRACT(_source, "data")');
    expect(queryString).toContain('LAST(extracted_data, @timestamp)');
    expect(queryString).toContain('extracted_data != "{}"');
    expect(queryString).toContain('BY group_hash');
    expect(queryString).toContain('KEEP group_hash, episode_data');
  });

  it('does not constrain the time window (grouping values are hash-invariant)', () => {
    const queryString = buildSeriesGroupingValuesEsqlQuery({
      ruleId: RULE_ID,
      groupHashes: ['gh-1'],
    }).print('basic');

    expect(queryString).not.toContain('@timestamp >=');
    expect(queryString).not.toContain('@timestamp <=');
  });
});

describe('parseSeriesGroupingValuesRows', () => {
  const row = (
    group_hash: string,
    data: Record<string, unknown> | null
  ): SeriesGroupingValuesRow => ({
    group_hash,
    episode_data: data == null ? null : JSON.stringify(data),
  });

  it('projects the rule grouping fields from each hash episode_data', () => {
    const rows = [
      row('gh-1', { 'host.name': 'web-01', region: 'us-east' }),
      row('gh-2', { 'host.name': 'web-02', region: 'eu-west' }),
    ];

    const result = parseSeriesGroupingValuesRows(rows, ['host.name', 'region']);

    expect(result).toEqual({
      'gh-1': { 'host.name': 'web-01', region: 'us-east' },
      'gh-2': { 'host.name': 'web-02', region: 'eu-west' },
    });
  });

  it('maps absent or empty values to null', () => {
    const rows = [row('gh-1', { 'host.name': 'web-01' })];

    const result = parseSeriesGroupingValuesRows(rows, ['host.name', 'region']);

    expect(result).toEqual({ 'gh-1': { 'host.name': 'web-01', region: null } });
  });

  it('maps every field to null when episode_data is missing or malformed', () => {
    const rows: SeriesGroupingValuesRow[] = [
      { group_hash: 'gh-1', episode_data: null },
      { group_hash: 'gh-2', episode_data: 'not-json' },
    ];

    const result = parseSeriesGroupingValuesRows(rows, ['host.name']);

    expect(result).toEqual({
      'gh-1': { 'host.name': null },
      'gh-2': { 'host.name': null },
    });
  });

  it('returns an empty map for no rows', () => {
    expect(parseSeriesGroupingValuesRows([], ['host.name'])).toEqual({});
  });
});
