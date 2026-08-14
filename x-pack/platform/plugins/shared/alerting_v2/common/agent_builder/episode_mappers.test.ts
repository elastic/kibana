/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_STATUS, type AlertEpisode } from '@kbn/alerting-v2-schemas';
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
    ).toEqual({
      ...baseEpisode,
      triggered_at: '2026-04-10T11:05:00.000Z',
      last_ack_action: 'ack',
      last_assignee_uid: 'user-1',
      last_snooze_action: undefined,
      snooze_expiry: undefined,
      last_tags: ['ops'],
      episode_data: '{"host":"a"}',
      severity: 'high',
    });
  });

  it('includes an optional episode name', () => {
    expect(
      alertEpisodeToEpisodeAttachment(baseEpisode, { episodeName: 'Host CPU high alert' })
    ).toEqual(expect.objectContaining({ 'episode.name': 'Host CPU high alert' }));
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
      } as AlertEpisode)
    ).toEqual({
      ...baseEpisode,
      triggered_at: undefined,
      last_ack_action: undefined,
      last_assignee_uid: undefined,
      last_snooze_action: undefined,
      snooze_expiry: undefined,
      last_tags: undefined,
      episode_data: undefined,
      severity: undefined,
    });
  });
});
