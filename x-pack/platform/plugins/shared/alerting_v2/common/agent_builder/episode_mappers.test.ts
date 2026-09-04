/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import type { AlertEpisode } from '@kbn/alerting-v2-schemas';
import { alertEpisodeToEpisodeAttachment } from './episode_mappers';

const baseEpisode = {
  '@timestamp': '2026-04-10T12:00:00.000Z',
  'episode.id': 'ep-1',
  'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
  'rule.id': 'rule-1',
  group_hash: 'gh-1',
  first_timestamp: '2026-04-10T11:00:00.000Z',
  last_timestamp: '2026-04-10T12:00:00.000Z',
  duration: 3600000,
};

describe('alertEpisodeToEpisodeAttachment', () => {
  it('copies episode fields into attachment data', () => {
    expect(
      alertEpisodeToEpisodeAttachment({
        ...baseEpisode,
        triggered_at: '2026-04-10T11:05:00.000Z',
        last_ack_action: 'ack',
        last_assignee_uid: 'user-1',
        last_tags: ['ops'],
        episode_data: '{"host":"a"}',
        severity: 'high',
      })
    ).toEqual(
      expect.objectContaining({
        'episode.id': 'ep-1',
        triggered_at: '2026-04-10T11:05:00.000Z',
        last_ack_action: 'ack',
        last_assignee_uid: 'user-1',
        last_tags: ['ops'],
        episode_data: '{"host":"a"}',
        severity: 'high',
      })
    );
  });

  it('resolves the episode label from the rule name', () => {
    expect(alertEpisodeToEpisodeAttachment(baseEpisode, { ruleName: 'Host CPU high' })).toEqual(
      expect.objectContaining({ 'episode.label': 'Host CPU high alert' })
    );
  });

  it('falls back to rule ID label when no rule name is provided', () => {
    expect(alertEpisodeToEpisodeAttachment(baseEpisode)).toEqual(
      expect.objectContaining({ 'episode.label': 'Alert for rule rule-1' })
    );
  });

  it('normalizes null optional fields from ES|QL to undefined', () => {
    expect(
      alertEpisodeToEpisodeAttachment({
        ...baseEpisode,
        triggered_at: null,
        last_ack_action: null,
        last_assignee_uid: null,
        last_snooze_action: null,
        snooze_expiry: null,
        last_tags: null,
        episode_data: null,
        severity: null,
      })
    ).toEqual(
      expect.objectContaining({
        triggered_at: undefined,
        last_ack_action: undefined,
        last_assignee_uid: undefined,
        last_snooze_action: undefined,
        snooze_expiry: undefined,
        last_tags: undefined,
        episode_data: undefined,
        severity: undefined,
      })
    );
  });

  it('converts null to undefined on any field, including required ones', () => {
    const episodeWithNullRequiredFields = {
      ...baseEpisode,
      group_hash: null,
      duration: null,
    } as unknown as AlertEpisode;

    const result = alertEpisodeToEpisodeAttachment(episodeWithNullRequiredFields);

    expect(result.group_hash).toBeUndefined();
    expect(result.duration).toBeUndefined();
    expect(result).not.toEqual(expect.objectContaining({ group_hash: null, duration: null }));
  });

  it('drops extra episode-row keys that are not on the attachment schema', () => {
    const episodeWithExtraColumn = {
      ...baseEpisode,
      extra_column: 'should-not-copy',
    } as unknown as AlertEpisode;

    expect(alertEpisodeToEpisodeAttachment(episodeWithExtraColumn)).not.toHaveProperty(
      'extra_column'
    );
  });
});
