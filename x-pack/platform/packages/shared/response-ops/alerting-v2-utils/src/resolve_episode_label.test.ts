/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_EPISODE_STATUS,
  MAX_EPISODE_LABEL_LENGTH,
  type AlertEpisode,
} from '@kbn/alerting-v2-schemas';
import { resolveEpisodeLabel } from './resolve_episode_label';

const baseEpisode: AlertEpisode = {
  '@timestamp': '2026-04-10T12:00:00.000Z',
  'episode.id': 'ep-1',
  'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
  'rule.id': 'rule-1',
  group_hash: 'gh-1',
  first_timestamp: '2026-04-10T11:00:00.000Z',
  last_timestamp: '2026-04-10T12:00:00.000Z',
  duration: 3600000,
};

describe('resolveEpisodeLabel', () => {
  it('appends "alert" to the rule name', () => {
    expect(resolveEpisodeLabel({ episode: baseEpisode, ruleName: 'Host CPU high' })).toBe(
      'Host CPU high alert'
    );
  });

  it('combines rule name and grouping values from episode_data', () => {
    const episode = {
      ...baseEpisode,
      episode_data: JSON.stringify({ host: { name: 'web-01' } }),
    };
    expect(
      resolveEpisodeLabel({ episode, ruleName: 'Host CPU high', groupingFields: ['host.name'] })
    ).toBe('Host CPU high alert for web-01');
  });

  it('joins multiple grouping field values', () => {
    const episode = {
      ...baseEpisode,
      episode_data: JSON.stringify({ host: { name: 'web-01' }, service: { name: 'checkout' } }),
    };
    expect(
      resolveEpisodeLabel({
        episode,
        ruleName: 'Host CPU high',
        groupingFields: ['host.name', 'service.name'],
      })
    ).toBe('Host CPU high alert for web-01 · checkout');
  });

  it('reads flattened top-level grouping keys', () => {
    const episode = {
      ...baseEpisode,
      episode_data: JSON.stringify({ 'host.name': 'web-01' }),
    };
    expect(
      resolveEpisodeLabel({ episode, ruleName: 'Host CPU high', groupingFields: ['host.name'] })
    ).toBe('Host CPU high alert for web-01');
  });

  it('skips grouping fields with missing values', () => {
    const episode = {
      ...baseEpisode,
      episode_data: JSON.stringify({ 'host.name': 'web-01' }),
    };
    expect(
      resolveEpisodeLabel({
        episode,
        ruleName: 'Host CPU high',
        groupingFields: ['host.name', 'service.name'],
      })
    ).toBe('Host CPU high alert for web-01');
  });

  it('uses grouping values alone when no rule name is available', () => {
    const episode = {
      ...baseEpisode,
      episode_data: JSON.stringify({ host: { name: 'web-01' } }),
    };
    expect(resolveEpisodeLabel({ episode, groupingFields: ['host.name'] })).toBe('web-01 alert');
  });

  it('ignores grouping fields when episode_data is absent', () => {
    expect(
      resolveEpisodeLabel({
        episode: baseEpisode,
        ruleName: 'Host CPU high',
        groupingFields: ['host.name'],
      })
    ).toBe('Host CPU high alert');
  });

  it('falls back to rule ID when no rule name or grouping values are available', () => {
    expect(resolveEpisodeLabel({ episode: baseEpisode })).toBe('Alert for rule rule-1');
    expect(resolveEpisodeLabel({ episode: baseEpisode, ruleName: '' })).toBe(
      'Alert for rule rule-1'
    );
  });

  it('falls back to rule ID for malformed episode_data', () => {
    const episode = { ...baseEpisode, episode_data: '{not json}' };
    expect(resolveEpisodeLabel({ episode, groupingFields: ['host.name'] })).toBe(
      'Alert for rule rule-1'
    );
  });

  it('truncates labels that exceed the episode attachment schema max', () => {
    const longGroup = 'g'.repeat(MAX_EPISODE_LABEL_LENGTH);
    const episode = {
      ...baseEpisode,
      episode_data: JSON.stringify({ 'host.name': longGroup }),
    };
    const label = resolveEpisodeLabel({
      episode,
      ruleName: 'Host CPU high',
      groupingFields: ['host.name'],
    });

    expect(label.startsWith('Host CPU high alert for ')).toBe(true);
    expect(label).toHaveLength(MAX_EPISODE_LABEL_LENGTH);
  });
});
