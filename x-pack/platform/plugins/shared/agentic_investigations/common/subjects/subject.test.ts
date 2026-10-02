/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_SLACK_SEEN_EVENT_IDS } from './constants';
import {
  alertSubjectSnapshotSchema,
  investigationSubjectInputSchema,
  investigationSubjectSchema,
  MAX_SUBJECT_SNAPSHOT_LENGTH,
} from './subject';

/** The shape Nightshift's `alertSnapshotSchema` produces. */
const nightshiftSnapshot = {
  id: 'alert-1',
  rule_id: 'rule-1',
  rule_name: 'High latency',
  rule_type_id: 'apm.transaction_duration',
  rule_category: 'Latency threshold',
  reason: 'p99 above 500 ms',
  status: 'active',
  start: '2026-07-28T14:00:00.000Z',
  flapping: false,
  grouping: { service: { name: 'checkout' } },
  group: [{ field: 'service.name', value: 'checkout' }],
  evaluation: { value: [612, null], threshold: [500] },
  rule_parameters: { threshold: 500 },
};

describe('alertSubjectSnapshotSchema', () => {
  it('accepts a Nightshift alert snapshot and keeps the fields it does not declare', () => {
    expect(alertSubjectSnapshotSchema.parse(nightshiftSnapshot)).toEqual(nightshiftSnapshot);
  });

  it('bounds the key count and the serialized size', () => {
    const manyKeys = Object.fromEntries(Array.from({ length: 51 }, (_, i) => [`k${i}`, i]));
    expect(alertSubjectSnapshotSchema.safeParse(manyKeys).success).toBe(false);
    expect(
      alertSubjectSnapshotSchema.safeParse({
        rule_parameters: { blob: 'x'.repeat(MAX_SUBJECT_SNAPSHOT_LENGTH) },
      }).success
    ).toBe(false);
  });
});

describe('investigationSubjectInputSchema', () => {
  it('accepts each subject type with its own fields', () => {
    for (const input of [
      { type: 'alert', id: 'alert-1', triggerType: 'automatic', snapshot: nightshiftSnapshot },
      { type: 'significant_event', id: 'event-1', summary: 'Checkout errors' },
      { type: 'manual', id: 'q-1', summary: 'Why is checkout slow?', triggerType: 'manual' },
      {
        type: 'slack_thread',
        id: 'team:T1/channel:C1/thread:1700000000.000100',
        summary: 'Why is checkout slow?',
        slack: {
          channel: 'C1',
          thread_ts: '1700000000.000100',
          permalink: 'https://example.slack.com/archives/C1/p1700000000000100',
        },
      },
    ]) {
      expect(investigationSubjectInputSchema.safeParse(input).success).toBe(true);
    }
  });

  it('keeps alert snapshots on alerts and Slack fields on Slack threads', () => {
    expect(
      investigationSubjectInputSchema.safeParse({
        type: 'manual',
        id: 'q-1',
        snapshot: nightshiftSnapshot,
      }).success
    ).toBe(false);
    expect(
      investigationSubjectInputSchema.safeParse({
        type: 'alert',
        id: 'alert-1',
        slack: { channel: 'C1', thread_ts: '1' },
      }).success
    ).toBe(false);
  });

  it('bounds the Slack event ids a thread remembers', () => {
    const withSeen = (count: number) =>
      investigationSubjectInputSchema.safeParse({
        type: 'slack_thread',
        id: 't',
        slack: {
          channel: 'C1',
          thread_ts: '1',
          seen_event_ids: Array.from({ length: count }, (_, index) => `Ev${index}`),
        },
      }).success;

    expect(withSeen(MAX_SLACK_SEEN_EVENT_IDS)).toBe(true);
    expect(withSeen(MAX_SLACK_SEEN_EVENT_IDS + 1)).toBe(false);
  });

  it('only accepts HTTPS Slack permalinks', () => {
    expect(
      investigationSubjectInputSchema.safeParse({
        type: 'slack_thread',
        id: 't',
        slack: { channel: 'C1', thread_ts: '1', permalink: 'http://example.slack.com/archives/C1' },
      }).success
    ).toBe(false);
  });
});

describe('investigationSubjectSchema', () => {
  it('validates a stored subject document', () => {
    expect(
      investigationSubjectSchema.safeParse({
        id: 'doc-1',
        spaceId: 'default',
        conversationId: 'conv-1',
        subjectType: 'alert',
        subjectId: 'alert-1',
        snapshot: nightshiftSnapshot,
        createdAt: '2026-07-28T14:00:00.000Z',
      }).success
    ).toBe(true);
  });
});
