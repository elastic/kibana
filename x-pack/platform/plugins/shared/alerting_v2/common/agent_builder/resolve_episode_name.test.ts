/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveEpisodeName, resolveGroupNameFromEpisodeData } from './resolve_episode_name';

describe('resolveEpisodeName', () => {
  it('appends "alert" to the rule name', () => {
    expect(resolveEpisodeName({ ruleName: 'Host CPU high' })).toBe('Host CPU high alert');
  });

  it('falls back to the group name when the rule name is missing', () => {
    expect(resolveEpisodeName({ groupName: 'web-01' })).toBe('web-01 alert');
    expect(resolveEpisodeName({ ruleName: '', groupName: 'web-01' })).toBe('web-01 alert');
  });

  it('combines the rule name and group name when both are available', () => {
    expect(resolveEpisodeName({ ruleName: 'Host CPU high', groupName: 'web-01' })).toBe(
      'Host CPU high alert for web-01'
    );
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

  it('uses data.rule_name from episode_data when no rule name is provided', () => {
    expect(
      resolveEpisodeName({ episodeData: JSON.stringify({ rule_name: 'External monitor' }) })
    ).toBe('External monitor alert');
  });

  it('does not invent a group from episode_data when the rule name is known and grouping fields are not', () => {
    expect(
      resolveEpisodeName({
        ruleName: 'Host CPU high',
        episodeData: JSON.stringify({ host: { name: 'web-01' } }),
      })
    ).toBe('Host CPU high alert');
  });

  it('uses grouping values from episode_data when no rule name is available', () => {
    expect(
      resolveEpisodeName({
        episodeData: JSON.stringify({ host: { name: 'web-01' } }),
        groupingFields: ['host.name'],
      })
    ).toBe('web-01 alert');
  });

  it('returns undefined when no name source is available', () => {
    expect(resolveEpisodeName()).toBeUndefined();
    expect(resolveEpisodeName({ ruleName: '', groupName: '' })).toBeUndefined();
    expect(resolveEpisodeName({ episodeData: '{}' })).toBeUndefined();
  });
});

describe('resolveGroupNameFromEpisodeData', () => {
  it('joins grouping field values', () => {
    expect(
      resolveGroupNameFromEpisodeData(
        JSON.stringify({ host: { name: 'web-01' }, service: { name: 'checkout' } }),
        ['host.name', 'service.name']
      )
    ).toBe('web-01 · checkout');
  });

  it('reads flattened top-level grouping keys', () => {
    expect(
      resolveGroupNameFromEpisodeData(JSON.stringify({ 'host.name': 'web-01' }), ['host.name'])
    ).toBe('web-01');
  });

  it('skips empty grouping values', () => {
    expect(
      resolveGroupNameFromEpisodeData(JSON.stringify({ 'host.name': 'web-01' }), [
        'host.name',
        'service.name',
      ])
    ).toBe('web-01');
  });

  it('collects string leaves when grouping fields are unknown, excluding rule_name', () => {
    expect(
      resolveGroupNameFromEpisodeData(
        JSON.stringify({ rule_name: 'CPU high', host: { name: 'web-01' }, count: 12 })
      )
    ).toBe('web-01');
  });

  it('returns undefined for missing or empty data', () => {
    expect(resolveGroupNameFromEpisodeData()).toBeUndefined();
    expect(resolveGroupNameFromEpisodeData('{}', ['host.name'])).toBeUndefined();
    expect(resolveGroupNameFromEpisodeData('{not json}')).toBeUndefined();
  });
});
