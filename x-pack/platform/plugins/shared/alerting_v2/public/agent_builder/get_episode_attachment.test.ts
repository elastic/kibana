/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertEpisode } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import { EPISODE_ATTACHMENT_TYPE } from '@kbn/alerting-v2-schemas';
import { getEpisodeAttachment, getEpisodeAttachmentData } from './get_episode_attachment';

const mockEpisode = {
  '@timestamp': '2026-05-08T08:00:00.000Z',
  'episode.id': 'ep-1',
  'episode.status': 'active' as const,
  'rule.id': 'rule-1',
  group_hash: 'group-1',
  first_timestamp: '2026-05-08T08:00:00.000Z',
  last_timestamp: '2026-05-08T08:05:00.000Z',
  triggered_at: '2026-05-08T08:00:00.000Z',
  duration: 300000,
  severity: 'high',
  episode_data: '{"host.name":"h1"}',
  last_ack_action: 'ack' as const,
  last_assignee_uid: 'u-1',
  last_snooze_action: 'snooze' as const,
  snooze_expiry: '2026-05-08T09:00:00.000Z',
} as AlertEpisode;

describe('getEpisodeAttachment', () => {
  it('maps AlertEpisode fields into EpisodeAttachmentData', () => {
    expect(getEpisodeAttachmentData(mockEpisode, 'default')).toEqual({
      episode_id: 'ep-1',
      episode_status: 'active',
      rule_id: 'rule-1',
      group_hash: 'group-1',
      first_timestamp: '2026-05-08T08:00:00.000Z',
      last_timestamp: '2026-05-08T08:05:00.000Z',
      duration: 300000,
      triggered_at: '2026-05-08T08:00:00.000Z',
      severity: 'high',
      episode_data: '{"host.name":"h1"}',
      last_ack_action: 'ack',
      last_assignee_uid: 'u-1',
      last_snooze_action: 'snooze',
      snooze_expiry: '2026-05-08T09:00:00.000Z',
      space_id: 'default',
    });
  });

  it('builds an AttachmentInput with type, origin, and stable id', () => {
    expect(getEpisodeAttachment(mockEpisode, 'space-a')).toEqual({
      id: `${EPISODE_ATTACHMENT_TYPE}:ep-1`,
      type: EPISODE_ATTACHMENT_TYPE,
      origin: 'ep-1',
      data: getEpisodeAttachmentData(mockEpisode, 'space-a'),
    });
  });

  it('stringifies object episode_data from ES|QL JSON_EXTRACT', () => {
    const episodeWithObjectData = {
      ...mockEpisode,
      episode_data: { count: '1487' },
    } as unknown as AlertEpisode;

    expect(getEpisodeAttachmentData(episodeWithObjectData, 'default').episode_data).toBe(
      '{"count":"1487"}'
    );
  });

  it('omits null optional fields from ES|QL', () => {
    const episodeWithNulls = {
      ...mockEpisode,
      triggered_at: null,
      severity: null,
      episode_data: null,
      last_ack_action: null,
      last_assignee_uid: null,
      last_snooze_action: null,
      snooze_expiry: null,
    } as unknown as AlertEpisode;

    expect(getEpisodeAttachmentData(episodeWithNulls, 'default')).toEqual({
      episode_id: 'ep-1',
      episode_status: 'active',
      rule_id: 'rule-1',
      group_hash: 'group-1',
      first_timestamp: '2026-05-08T08:00:00.000Z',
      last_timestamp: '2026-05-08T08:05:00.000Z',
      duration: 300000,
      space_id: 'default',
    });
  });
});
