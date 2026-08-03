/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import {
  mapClassicAlertToEpisode,
  mapClassicAlertToHistogramRow,
  mapClassicStatusToEpisodeStatus,
} from './map_alert';

describe('mapClassicStatusToEpisodeStatus', () => {
  it('maps "active" to the active episode status', () => {
    expect(mapClassicStatusToEpisodeStatus('active')).toBe(ALERT_EPISODE_STATUS.ACTIVE);
  });

  it('maps "recovered" to inactive', () => {
    expect(mapClassicStatusToEpisodeStatus('recovered')).toBe(ALERT_EPISODE_STATUS.INACTIVE);
  });

  it('maps "untracked" to inactive', () => {
    expect(mapClassicStatusToEpisodeStatus('untracked')).toBe(ALERT_EPISODE_STATUS.INACTIVE);
  });

  it('maps undefined to inactive', () => {
    expect(mapClassicStatusToEpisodeStatus(undefined)).toBe(ALERT_EPISODE_STATUS.INACTIVE);
  });
});

describe('mapClassicAlertToEpisode', () => {
  const baseSource = {
    'kibana.alert.uuid': 'alert-uuid-1',
    'kibana.alert.start': '2024-01-01T00:00:00.000Z',
    '@timestamp': '2024-01-01T01:00:00.000Z',
    'kibana.alert.end': '2024-01-01T02:00:00.000Z',
    'kibana.alert.status': 'active',
    'kibana.alert.rule.uuid': 'rule-uuid-1',
    'kibana.alert.rule.name': 'My Rule',
    'kibana.alert.rule.tags': ['tag-a', 'tag-b'],
    'kibana.alert.duration.us': 7_200_000_000,
    'kibana.alert.severity': 'critical',
  };

  it('maps all fields correctly', () => {
    const episode = mapClassicAlertToEpisode(baseSource);

    expect(episode).toMatchObject({
      '@timestamp': '2024-01-01T01:00:00.000Z',
      'episode.id': 'alert-uuid-1',
      'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
      'rule.id': 'rule-uuid-1',
      group_hash: 'alert-uuid-1',
      first_timestamp: '2024-01-01T00:00:00.000Z',
      last_timestamp: '2024-01-01T02:00:00.000Z',
      duration: 7_200_000,
      triggered_at: '2024-01-01T00:00:00.000Z',
      last_tags: ['tag-a', 'tag-b'],
      severity: 'critical',
      supports_actions: false,
      supports_timeline: false,
    });
  });

  it('sets capability flags to false for classic alerts', () => {
    const episode = mapClassicAlertToEpisode(baseSource);
    expect(episode.supports_actions).toBe(false);
    expect(episode.supports_timeline).toBe(false);
  });

  it('handles missing optional fields gracefully', () => {
    const minimalSource = {
      '@timestamp': '2024-01-01T00:00:00.000Z',
      'kibana.alert.uuid': 'uuid-minimal',
      'kibana.alert.status': 'recovered',
      'kibana.alert.rule.uuid': 'rule-1',
    };

    const episode = mapClassicAlertToEpisode(minimalSource);

    expect(episode['episode.id']).toBe('uuid-minimal');
    expect(episode['episode.status']).toBe(ALERT_EPISODE_STATUS.INACTIVE);
    expect(episode.severity).toBeNull();
    expect(episode.last_tags).toEqual([]);
    expect(episode.last_assignee_uid).toBeNull();
    expect(episode.episode_data).toBeNull();
  });

  it('computes duration from start/end when kibana.alert.duration.us is absent', () => {
    const source = {
      'kibana.alert.uuid': 'uuid-1',
      'kibana.alert.start': '2024-01-01T00:00:00.000Z',
      'kibana.alert.end': '2024-01-01T00:05:00.000Z',
      '@timestamp': '2024-01-01T00:05:00.000Z',
      'kibana.alert.status': 'recovered',
      'kibana.alert.rule.uuid': 'rule-1',
    };

    const episode = mapClassicAlertToEpisode(source);
    expect(episode.duration).toBe(300_000);
  });

  it('handles array-wrapped field values', () => {
    const source = {
      'kibana.alert.uuid': ['uuid-array'],
      'kibana.alert.start': ['2024-01-01T00:00:00.000Z'],
      '@timestamp': ['2024-01-01T00:00:00.000Z'],
      'kibana.alert.status': ['active'],
      'kibana.alert.rule.uuid': ['rule-uuid'],
      'kibana.alert.rule.name': ['Array Rule'],
      'kibana.alert.duration.us': [5_000_000],
    };

    const episode = mapClassicAlertToEpisode(source);
    expect(episode['episode.id']).toBe('uuid-array');
    expect(episode.duration).toBe(5_000);
  });

  it('does not include v2-only ack/snooze fields', () => {
    const episode = mapClassicAlertToEpisode(baseSource);
    expect(episode).not.toHaveProperty('last_ack_action');
    expect(episode).not.toHaveProperty('last_snooze_action');
    expect(episode).not.toHaveProperty('snooze_expiry');
  });
});

describe('mapClassicAlertToHistogramRow', () => {
  const source = {
    'kibana.alert.start': '2024-01-01T00:00:00.000Z',
    'kibana.alert.end': '2024-01-01T01:00:00.000Z',
    '@timestamp': '2024-01-01T01:00:00.000Z',
    'kibana.alert.status': 'active',
    'kibana.alert.rule.uuid': 'rule-1',
  };

  it('maps timestamps and status', () => {
    const row = mapClassicAlertToHistogramRow(source);

    expect(row.first_timestamp).toBe('2024-01-01T00:00:00.000Z');
    expect(row.last_timestamp).toBe('2024-01-01T01:00:00.000Z');
    expect(row['episode.status']).toBe(ALERT_EPISODE_STATUS.ACTIVE);
  });

  it('resolves breakdown field for rule.id', () => {
    const row = mapClassicAlertToHistogramRow(source, 'rule.id');
    expect(row['rule.id']).toBe('rule-1');
  });

  it('resolves breakdown field for episode.status', () => {
    const row = mapClassicAlertToHistogramRow(source, 'episode.status');
    expect(row['episode.status']).toBe(ALERT_EPISODE_STATUS.ACTIVE);
  });

  it('resolves breakdown to "ack" when workflow_status is acknowledged', () => {
    const acked = { ...source, 'kibana.alert.workflow_status': 'acknowledged' };
    const row = mapClassicAlertToHistogramRow(acked, 'last_ack_action');
    expect(row.last_ack_action).toBe('ack');
  });

  it('resolves breakdown to "unack" when workflow_status is open', () => {
    const open = { ...source, 'kibana.alert.workflow_status': 'open' };
    const row = mapClassicAlertToHistogramRow(open, 'last_ack_action');
    expect(row.last_ack_action).toBe('unack');
  });

  it('resolves breakdown to "unack" when workflow_status is absent', () => {
    const row = mapClassicAlertToHistogramRow(source, 'last_ack_action');
    expect(row.last_ack_action).toBe('unack');
  });

  it('returns null for unsupported breakdown fields', () => {
    const row = mapClassicAlertToHistogramRow(source, 'last_assignee_uid');
    expect(row.last_assignee_uid).toBeNull();
  });

  it('omits breakdown when not provided', () => {
    const row = mapClassicAlertToHistogramRow(source);
    expect(Object.keys(row)).toEqual(['first_timestamp', 'last_timestamp', 'episode.status']);
  });
});
