/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import {
  mapClassicAlertToEpisode,
  mapClassicStatusToEpisodeStatus,
  type ClassicAlertActionContext,
} from './map_alert';

const TEST_INDEX = '.internal.alerts-observability.logs.alerts-default-000001';

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
    'kibana.alert.instance.id': 'instance-1',
    'kibana.alert.start': '2024-01-01T00:00:00.000Z',
    '@timestamp': '2024-01-01T01:00:00.000Z',
    'kibana.alert.end': '2024-01-01T02:00:00.000Z',
    'kibana.alert.status': 'active',
    'kibana.alert.rule.uuid': 'rule-uuid-1',
    'kibana.alert.rule.name': 'My Rule',
    'kibana.alert.workflow_tags': ['tag-a', 'tag-b'],
    'kibana.alert.workflow_status': 'open',
    'kibana.alert.duration.us': 7_200_000_000,
    'kibana.alert.severity': 'critical',
  };

  it('maps all fields correctly', () => {
    const episode = mapClassicAlertToEpisode(baseSource, TEST_INDEX);

    expect(episode).toMatchObject({
      '@timestamp': '2024-01-01T01:00:00.000Z',
      'episode.id': 'alert-uuid-1',
      'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
      'rule.id': 'rule-uuid-1',
      'rule.name': 'My Rule',
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
    const episode = mapClassicAlertToEpisode(baseSource, TEST_INDEX);
    expect(episode.supports_actions).toBe(false);
    expect(episode.supports_timeline).toBe(false);
  });

  it('populates source_action_context with classic alert metadata', () => {
    const episode = mapClassicAlertToEpisode(baseSource, TEST_INDEX);
    const ctx = episode.source_action_context as ClassicAlertActionContext;

    expect(ctx).toEqual({
      index: TEST_INDEX,
      alertUuid: 'alert-uuid-1',
      instanceId: 'instance-1',
      ruleId: 'rule-uuid-1',
      workflowStatus: 'open',
      workflowTags: ['tag-a', 'tag-b'],
    });
  });

  it('handles missing optional fields gracefully', () => {
    const minimalSource = {
      '@timestamp': '2024-01-01T00:00:00.000Z',
      'kibana.alert.uuid': 'uuid-minimal',
      'kibana.alert.status': 'recovered',
      'kibana.alert.rule.uuid': 'rule-1',
    };

    const episode = mapClassicAlertToEpisode(minimalSource, TEST_INDEX);

    expect(episode['episode.id']).toBe('uuid-minimal');
    expect(episode['episode.status']).toBe(ALERT_EPISODE_STATUS.INACTIVE);
    expect(episode['rule.name']).toBeUndefined();
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

    const episode = mapClassicAlertToEpisode(source, TEST_INDEX);
    expect(episode.duration).toBe(300_000);
  });

  it('handles all typed optional fields', () => {
    const source = {
      'kibana.alert.uuid': 'uuid-1',
      'kibana.alert.start': '2024-01-01T00:00:00.000Z',
      '@timestamp': '2024-01-01T00:00:00.000Z',
      'kibana.alert.status': 'active',
      'kibana.alert.rule.uuid': 'rule-uuid',
      'kibana.alert.duration.us': 5_000_000,
    };

    const episode = mapClassicAlertToEpisode(source, TEST_INDEX);
    expect(episode['episode.id']).toBe('uuid-1');
    expect(episode.duration).toBe(5_000);
  });

  it('does not include v2-only snooze fields and sets last_ack_action from workflow status', () => {
    const episode = mapClassicAlertToEpisode(baseSource, TEST_INDEX);
    expect(episode.last_ack_action).toBeNull();
    expect(episode).not.toHaveProperty('last_snooze_action');
    expect(episode).not.toHaveProperty('snooze_expiry');
  });
});
