/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IncidentTimelineAlert } from '../../../../common/types/api';
import type { TimelineEntry } from '.';
import { buildTimelineEvents } from '.';

const MINUTE = 60 * 1000;
const T0 = Date.parse('2026-09-01T09:00:00.000Z');
const iso = (ms: number) => new Date(ms).toISOString();

const alert = (id: string, minute: number, ruleName: string): IncidentTimelineAlert => ({
  id,
  index: '.alerts-security.alerts-default',
  time: iso(T0 + minute * MINUTE),
  timeSource: 'original_time',
  timestamp: iso(T0 + minute * MINUTE),
  ruleId: ruleName,
  ruleName,
  hostNames: [],
  userNames: [],
});

const entry = (id: string, minute: number): TimelineEntry => ({
  id,
  version: 'v1',
  category: 'actor',
  occurredMs: T0 + minute * MINUTE,
  createdBy: 'analyst',
  data: { title: id, occurredAt: iso(T0 + minute * MINUTE) },
});

describe('buildTimelineEvents', () => {
  it('lists status changes, entries and every alert in time order', () => {
    const events = buildTimelineEvents({
      markers: [
        { kind: 'created', atMs: T0 + 5 * MINUTE, user: 'analyst' },
        { kind: 'closed', atMs: T0 + 30 * MINUTE, user: 'analyst' },
      ],
      entries: [entry('pasted', 1)],
      alerts: [
        alert('late', 20, 'Credentials'),
        alert('first', 0, 'Base64'),
        alert('b', 3, 'Dscl'),
      ],
    });

    expect(events.map(({ id }) => id)).toEqual([
      'alert-first',
      'entry-pasted',
      'alert-b',
      'status-0',
      'alert-late',
      'status-1',
    ]);
    expect(events[0]).toMatchObject({ kind: 'alert', ruleName: 'Base64' });
  });

  it('puts case events before alerts at the same time', () => {
    const events = buildTimelineEvents({
      markers: [{ kind: 'created', atMs: T0, user: 'analyst' }],
      entries: [entry('same', 0)],
      alerts: [alert('same', 0, 'Rule')],
    });
    expect(events.map(({ kind }) => kind)).toEqual(['status', 'entry', 'alert']);
  });
});
