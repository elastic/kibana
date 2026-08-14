/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveEpisodeName } from './resolve_episode_name';

describe('resolveEpisodeName', () => {
  it('appends "alert" to the rule name', () => {
    expect(resolveEpisodeName({ ruleName: 'Host CPU high' })).toBe('Host CPU high alert');
  });

  it('combines rule name and grouping values from episode_data', () => {
    expect(
      resolveEpisodeName({
        ruleName: 'Host CPU high',
        episodeData: JSON.stringify({ host: { name: 'web-01' } }),
        groupingFields: ['host.name'],
      })
    ).toBe('Host CPU high alert for web-01');
  });

  it('joins multiple grouping field values', () => {
    expect(
      resolveEpisodeName({
        ruleName: 'Host CPU high',
        episodeData: JSON.stringify({ host: { name: 'web-01' }, service: { name: 'checkout' } }),
        groupingFields: ['host.name', 'service.name'],
      })
    ).toBe('Host CPU high alert for web-01 · checkout');
  });

  it('reads flattened top-level grouping keys', () => {
    expect(
      resolveEpisodeName({
        ruleName: 'Host CPU high',
        episodeData: JSON.stringify({ 'host.name': 'web-01' }),
        groupingFields: ['host.name'],
      })
    ).toBe('Host CPU high alert for web-01');
  });

  it('skips grouping fields with missing values', () => {
    expect(
      resolveEpisodeName({
        ruleName: 'Host CPU high',
        episodeData: JSON.stringify({ 'host.name': 'web-01' }),
        groupingFields: ['host.name', 'service.name'],
      })
    ).toBe('Host CPU high alert for web-01');
  });

  it('uses grouping values alone when no rule name is available', () => {
    expect(
      resolveEpisodeName({
        episodeData: JSON.stringify({ host: { name: 'web-01' } }),
        groupingFields: ['host.name'],
      })
    ).toBe('web-01 alert');
  });

  it('ignores grouping fields when episode_data is absent', () => {
    expect(resolveEpisodeName({ ruleName: 'Host CPU high', groupingFields: ['host.name'] })).toBe(
      'Host CPU high alert'
    );
  });

  it('returns undefined when no name source is available', () => {
    expect(resolveEpisodeName()).toBeUndefined();
    expect(resolveEpisodeName({ ruleName: '' })).toBeUndefined();
    expect(resolveEpisodeName({ episodeData: '{}', groupingFields: ['host.name'] })).toBeUndefined();
  });

  it('returns undefined for malformed episode_data', () => {
    expect(
      resolveEpisodeName({ episodeData: '{not json}', groupingFields: ['host.name'] })
    ).toBeUndefined();
  });
});
