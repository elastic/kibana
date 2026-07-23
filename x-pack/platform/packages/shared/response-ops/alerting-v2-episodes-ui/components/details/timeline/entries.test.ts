/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import type { EpisodeEventRow } from '../../../queries/episode_events_query';
import type { EpisodeActionHistoryEntry } from '../../../queries/episode_actions_history_query';
import {
  deriveSeverityChangeEntries,
  deriveStateChangeEntries,
  mergeTimelineEntries,
} from './entries';

const makeRow = (status: string, ts: string): EpisodeEventRow => ({
  '@timestamp': ts,
  'episode.id': 'ep-1',
  'episode.status': status as EpisodeEventRow['episode.status'],
  'rule.id': 'rule-1',
  group_hash: 'hash-1',
});

const makeAction = (ts: string): EpisodeActionHistoryEntry => ({
  _id: `action-${ts}`,
  '@timestamp': ts,
  action_type: 'ack',
  actor: 'user-uid-1',
  episode_id: 'ep-1',
  group_hash: 'hash-1',
  tags: null,
  assignee_uid: null,
  expiry: null,
  reason: null,
});

const makeSeverityRow = (severity: string | null, ts: string) => ({
  '@timestamp': ts,
  severity,
  event_count: 1,
});

describe('deriveStateChangeEntries', () => {
  it('returns empty array for empty input', () => {
    expect(deriveStateChangeEntries([])).toHaveLength(0);
  });

  it('returns a single initial entry with no prevStatus for a one-row input', () => {
    const entries = deriveStateChangeEntries([
      makeRow(ALERT_EPISODE_STATUS.PENDING, '2024-01-01T00:00:00.000Z'),
    ]);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({
      kind: 'state_change',
      timestamp: '2024-01-01T00:00:00.000Z',
      newStatus: ALERT_EPISODE_STATUS.PENDING,
      prevStatus: undefined,
      prevEventCount: 0,
    });
  });

  it('does not emit an entry when the status does not change', () => {
    const rows = [
      makeRow(ALERT_EPISODE_STATUS.PENDING, '2024-01-01T00:00:00.000Z'),
      makeRow(ALERT_EPISODE_STATUS.PENDING, '2024-01-01T00:01:00.000Z'),
      makeRow(ALERT_EPISODE_STATUS.PENDING, '2024-01-01T00:02:00.000Z'),
    ];
    expect(deriveStateChangeEntries(rows)).toHaveLength(1);
  });

  it('emits a transition entry with correct prevEventCount', () => {
    const rows = [
      makeRow(ALERT_EPISODE_STATUS.PENDING, '2024-01-01T00:00:00.000Z'),
      makeRow(ALERT_EPISODE_STATUS.PENDING, '2024-01-01T00:01:00.000Z'),
      makeRow(ALERT_EPISODE_STATUS.ACTIVE, '2024-01-01T00:02:00.000Z'),
    ];
    const entries = deriveStateChangeEntries(rows);
    expect(entries).toHaveLength(2);
    expect(entries[1]).toEqual({
      kind: 'state_change',
      timestamp: '2024-01-01T00:02:00.000Z',
      newStatus: ALERT_EPISODE_STATUS.ACTIVE,
      prevStatus: ALERT_EPISODE_STATUS.PENDING,
      prevEventCount: 2,
    });
  });

  it('uses grouped event counts when calculating prevEventCount', () => {
    const entries = deriveStateChangeEntries([
      {
        ...makeRow(ALERT_EPISODE_STATUS.PENDING, '2024-01-01T00:00:00.000Z'),
        event_count: 3,
      },
      {
        ...makeRow(ALERT_EPISODE_STATUS.ACTIVE, '2024-01-01T00:02:00.000Z'),
        event_count: 1,
      },
    ]);

    expect(entries[1]).toMatchObject({
      newStatus: ALERT_EPISODE_STATUS.ACTIVE,
      prevStatus: ALERT_EPISODE_STATUS.PENDING,
      prevEventCount: 3,
    });
  });

  it('handles multiple sequential transitions', () => {
    const rows = [
      makeRow(ALERT_EPISODE_STATUS.PENDING, '2024-01-01T00:00:00.000Z'),
      makeRow(ALERT_EPISODE_STATUS.ACTIVE, '2024-01-01T00:01:00.000Z'),
      makeRow(ALERT_EPISODE_STATUS.RECOVERING, '2024-01-01T00:02:00.000Z'),
      makeRow(ALERT_EPISODE_STATUS.INACTIVE, '2024-01-01T00:03:00.000Z'),
    ];
    const entries = deriveStateChangeEntries(rows);
    expect(entries).toHaveLength(4);
    expect(entries[0].prevStatus).toBeUndefined();
    expect(entries[1]).toMatchObject({
      newStatus: ALERT_EPISODE_STATUS.ACTIVE,
      prevStatus: ALERT_EPISODE_STATUS.PENDING,
      prevEventCount: 1,
    });
    expect(entries[2]).toMatchObject({
      newStatus: ALERT_EPISODE_STATUS.RECOVERING,
      prevStatus: ALERT_EPISODE_STATUS.ACTIVE,
      prevEventCount: 1,
    });
    expect(entries[3]).toMatchObject({
      newStatus: ALERT_EPISODE_STATUS.INACTIVE,
      prevStatus: ALERT_EPISODE_STATUS.RECOVERING,
      prevEventCount: 1,
    });
  });

  it('correctly handles a non-contiguous return to a prior status (flapping)', () => {
    const rows = [
      makeRow(ALERT_EPISODE_STATUS.ACTIVE, '2024-01-01T00:00:00.000Z'),
      makeRow(ALERT_EPISODE_STATUS.RECOVERING, '2024-01-01T00:01:00.000Z'),
      makeRow(ALERT_EPISODE_STATUS.ACTIVE, '2024-01-01T00:02:00.000Z'),
    ];

    const entries = deriveStateChangeEntries(rows);

    expect(entries).toHaveLength(3);
    expect(entries[2]).toMatchObject({
      newStatus: ALERT_EPISODE_STATUS.ACTIVE,
      prevStatus: ALERT_EPISODE_STATUS.RECOVERING,
      prevEventCount: 1,
    });
  });
});

describe('mergeTimelineEntries', () => {
  it('returns an empty array when there are no entries', () => {
    expect(mergeTimelineEntries([], [], [])).toHaveLength(0);
  });

  it('merges state changes, severity changes, and actions sorted newest-first', () => {
    const stateChanges = deriveStateChangeEntries([
      makeRow(ALERT_EPISODE_STATUS.PENDING, '2024-01-01T00:00:00.000Z'),
      makeRow(ALERT_EPISODE_STATUS.ACTIVE, '2024-01-01T00:02:00.000Z'),
    ]);
    const severityChanges = deriveSeverityChangeEntries([
      makeSeverityRow('high', '2024-01-01T00:03:00.000Z'),
    ]);
    const actions = [makeAction('2024-01-01T00:01:00.000Z')];

    const merged = mergeTimelineEntries(stateChanges, severityChanges, actions);

    expect(merged.map((e) => (e.kind === 'action' ? e.entry['@timestamp'] : e.timestamp))).toEqual([
      '2024-01-01T00:03:00.000Z',
      '2024-01-01T00:02:00.000Z',
      '2024-01-01T00:01:00.000Z',
      '2024-01-01T00:00:00.000Z',
    ]);
    expect(merged[0].kind).toBe('severity_change');
    expect(merged[2].kind).toBe('action');
  });

  it('puts the initial state change ("Episode started") last when it ties with the initial severity change', () => {
    const stateChanges = deriveStateChangeEntries([
      makeRow(ALERT_EPISODE_STATUS.PENDING, '2024-01-01T00:00:00.000Z'),
    ]);
    const severityChanges = deriveSeverityChangeEntries([
      makeSeverityRow('high', '2024-01-01T00:00:00.000Z'),
    ]);

    const merged = mergeTimelineEntries(stateChanges, severityChanges, []);

    expect(merged.map((e) => e.kind)).toEqual(['severity_change', 'state_change']);
  });
});

describe('deriveSeverityChangeEntries', () => {
  it('returns empty array for empty input', () => {
    expect(deriveSeverityChangeEntries([])).toHaveLength(0);
  });

  it('returns a single initial entry with no prevSeverity for a one-row input', () => {
    const entries = deriveSeverityChangeEntries([
      makeSeverityRow('high', '2024-01-01T00:00:00.000Z'),
    ]);

    expect(entries).toEqual([
      {
        kind: 'severity_change',
        timestamp: '2024-01-01T00:00:00.000Z',
        newSeverity: 'high',
        prevSeverity: undefined,
        prevEventCount: 0,
      },
    ]);
  });

  it('does not emit an entry when the severity does not change', () => {
    const entries = deriveSeverityChangeEntries([
      makeSeverityRow('high', '2024-01-01T00:00:00.000Z'),
      makeSeverityRow('HIGH', '2024-01-01T00:01:00.000Z'),
      makeSeverityRow('high', '2024-01-01T00:02:00.000Z'),
    ]);

    expect(entries).toHaveLength(1);
  });

  it('emits transition entries with grouped event counts', () => {
    const entries = deriveSeverityChangeEntries([
      { ...makeSeverityRow('high', '2024-01-01T00:00:00.000Z'), event_count: 3 },
      makeSeverityRow('low', '2024-01-01T00:02:00.000Z'),
    ]);

    expect(entries[1]).toMatchObject({
      newSeverity: 'low',
      prevSeverity: 'high',
      prevEventCount: 3,
    });
  });

  it('ignores unsupported severities', () => {
    const entries = deriveSeverityChangeEntries([
      makeSeverityRow(null, '2024-01-01T00:00:00.000Z'),
      makeSeverityRow('sev1', '2024-01-01T00:01:00.000Z'),
      makeSeverityRow('critical', '2024-01-01T00:02:00.000Z'),
    ]);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ newSeverity: 'critical' });
  });

  it('correctly handles a non-contiguous return to a prior severity (flapping)', () => {
    const entries = deriveSeverityChangeEntries([
      makeSeverityRow('low', '2024-01-01T00:00:00.000Z'),
      makeSeverityRow('high', '2024-01-01T00:01:00.000Z'),
      makeSeverityRow('low', '2024-01-01T00:02:00.000Z'),
    ]);

    expect(entries).toHaveLength(3);
    expect(entries[2]).toMatchObject({
      newSeverity: 'low',
      prevSeverity: 'high',
      prevEventCount: 1,
    });
  });
});
