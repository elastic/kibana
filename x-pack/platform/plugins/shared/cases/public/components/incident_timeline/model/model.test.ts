/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseStatuses } from '../../../../common/types/domain';
import type { IncidentTimelineAlert } from '../../../../common/types/api';
import { INCIDENT_TIMELINE_ENTRY_ATTACHMENT_TYPE } from '../../../../common/constants/attachments';
import type { StatusChange, TimeWindow } from '.';
import {
  TIMELINE_DENSITY,
  buildAlertRows,
  buildCaseLane,
  buildDiscoverParams,
  buildEntryRows,
  buildTimelineModel,
  groupCaseMarkers,
  parseTimelineEntries,
  renderAlertRow,
} from '.';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const T0 = Date.parse('2026-09-01T09:00:00.000Z');
const iso = (ms: number) => new Date(ms).toISOString();

const alert = (
  id: string,
  timeMs: number,
  overrides: Partial<IncidentTimelineAlert> = {}
): IncidentTimelineAlert => ({
  id,
  index: '.alerts-security.alerts-default',
  time: iso(timeMs),
  timeSource: 'original_time',
  timestamp: iso(timeMs + 30 * 1000),
  ruleId: 'rule-a',
  ruleName: 'Rule A',
  hostNames: [],
  userNames: [],
  ...overrides,
});

const change = (status: CaseStatuses, atMs: number, user = 'analyst'): StatusChange => ({
  status,
  atMs,
  user,
});

describe('buildCaseLane', () => {
  it('marks any change away from closed as a reopen, including closed to in progress', () => {
    const { markers } = buildCaseLane({
      createdAtMs: T0,
      createdBy: 'creator',
      statusChanges: [
        change(CaseStatuses.closed, T0 + HOUR),
        change(CaseStatuses.open, T0 + 2 * HOUR),
        change(CaseStatuses['in-progress'], T0 + 3 * HOUR),
        change(CaseStatuses.closed, T0 + 4 * HOUR),
        change(CaseStatuses['in-progress'], T0 + 5 * HOUR),
        change(CaseStatuses.open, T0 + 6 * HOUR),
        change(CaseStatuses.closed, T0 + 7 * HOUR),
      ],
      nowMs: T0 + 10 * HOUR,
    });

    expect(markers.map(({ kind }) => kind)).toEqual([
      'created',
      'closed',
      'reopened',
      'in_progress',
      'closed',
      'reopened',
      'opened',
      'closed',
    ]);
  });

  it('ends a closed case at its last close and keeps who changed the status', () => {
    const lane = buildCaseLane({
      createdAtMs: T0,
      createdBy: 'creator',
      statusChanges: [
        { status: CaseStatuses['in-progress'], atMs: T0 + HOUR, user: 'whitfield' },
        { status: CaseStatuses.closed, atMs: T0 + 2 * HOUR, user: 'rootly', source: 'api' },
      ],
      nowMs: T0 + 10 * HOUR,
    });

    expect(lane.spans).toEqual([
      { status: CaseStatuses.open, startMs: T0, endMs: T0 + HOUR },
      { status: CaseStatuses['in-progress'], startMs: T0 + HOUR, endMs: T0 + 2 * HOUR },
    ]);
    expect(lane.markers[2]).toEqual({
      kind: 'closed',
      atMs: T0 + 2 * HOUR,
      user: 'rootly',
      source: 'api',
    });
  });

  it('runs the last span of an open case to now, whatever the order of the changes', () => {
    const lane = buildCaseLane({
      createdAtMs: T0,
      createdBy: 'creator',
      statusChanges: [
        change(CaseStatuses.open, T0 + 2 * HOUR),
        change(CaseStatuses.closed, T0 + HOUR),
      ],
      nowMs: T0 + 5 * HOUR,
    });

    expect(lane.spans).toEqual([
      { status: CaseStatuses.open, startMs: T0, endMs: T0 + HOUR },
      { status: CaseStatuses.closed, startMs: T0 + HOUR, endMs: T0 + 2 * HOUR },
      { status: CaseStatuses.open, startMs: T0 + 2 * HOUR, endMs: T0 + 5 * HOUR },
    ]);
  });

  it('ignores a change to the status the case already has', () => {
    const lane = buildCaseLane({
      createdAtMs: T0,
      createdBy: 'creator',
      statusChanges: [change(CaseStatuses.open, T0 + HOUR)],
      nowMs: T0 + 2 * HOUR,
    });
    expect(lane.markers).toHaveLength(1);
    expect(lane.spans).toEqual([{ status: CaseStatuses.open, startMs: T0, endMs: T0 + 2 * HOUR }]);
  });
});

describe('groupCaseMarkers', () => {
  const window: TimeWindow = { startMs: T0, endMs: T0 + 1000 * MINUTE };

  it('merges markers closer than markerMergePx at the given width', () => {
    // 1000 px wide: one minute per pixel.
    const mergePx = TIMELINE_DENSITY.markerMergePx;
    const markers = [
      { kind: 'closed' as const, atMs: T0 + 100 * MINUTE, user: 'a' },
      { kind: 'reopened' as const, atMs: T0 + (100 + mergePx - 1) * MINUTE, user: 'b' },
      { kind: 'closed' as const, atMs: T0 + (100 + mergePx) * MINUTE, user: 'c' },
    ];

    const groups = groupCaseMarkers(markers, window, 1000);

    expect(groups.map(({ markers: grouped }) => grouped.map(({ user }) => user))).toEqual([
      ['a', 'b'],
      ['c'],
    ]);
    expect(groups[0].atMs).toBe(T0 + 100 * MINUTE);
  });

  it('separates the same markers once the window is zoomed in', () => {
    const markers = [
      { kind: 'closed' as const, atMs: T0 + 100 * MINUTE, user: 'a' },
      { kind: 'reopened' as const, atMs: T0 + 107 * MINUTE, user: 'b' },
    ];
    expect(
      groupCaseMarkers(markers, { startMs: T0 + 90 * MINUTE, endMs: T0 + 120 * MINUTE }, 1000)
    ).toHaveLength(2);
  });
});

describe('buildAlertRows', () => {
  it('makes one row per rule ordered by first alert time', () => {
    const rows = buildAlertRows([
      alert('late', T0 + 6 * HOUR, { ruleId: 'cred', ruleName: 'Credentials' }),
      alert('burst-2', T0 + 2 * MINUTE, { ruleId: 'b64', ruleName: 'Base64' }),
      alert('burst-1', T0 + MINUTE, { ruleId: 'multi', ruleName: 'Multiple' }),
      alert('burst-3', T0 + 3 * MINUTE, { ruleId: 'multi', ruleName: 'Multiple' }),
    ]);

    expect(rows.map(({ ruleName, alerts }) => [ruleName, alerts.map(({ id }) => id)])).toEqual([
      ['Multiple', ['burst-1', 'burst-3']],
      ['Base64', ['burst-2']],
      ['Credentials', ['late']],
    ]);
  });
});

describe('renderAlertRow', () => {
  const window: TimeWindow = { startMs: T0, endMs: T0 + 100 * HOUR };
  // 100 px wide with 12 px buckets gives 8 buckets of 12.5 h, rounded up to 1 day.

  it('draws points when no bucket holds more than cellThreshold alerts', () => {
    const [row] = buildAlertRows(
      Array.from({ length: TIMELINE_DENSITY.cellThreshold }, (_, i) =>
        alert(`a${i}`, T0 + i * MINUTE)
      )
    );
    const rendering = renderAlertRow(row, window, 100);
    expect(rendering.kind).toBe('points');
  });

  it('draws count cells with distinct hosts once one bucket holds more', () => {
    const [row] = buildAlertRows(
      Array.from({ length: TIMELINE_DENSITY.cellThreshold + 1 }, (_, i) =>
        alert(`a${i}`, T0 + i * MINUTE, { hostNames: [i === 0 ? 'host-1' : 'host-2'] })
      )
    );

    const rendering = renderAlertRow(row, window, 100);

    expect(rendering.kind).toBe('cells');
    if (rendering.kind !== 'cells') return;
    expect(rendering.cells).toHaveLength(1);
    expect(rendering.cells[0]).toMatchObject({
      count: TIMELINE_DENSITY.cellThreshold + 1,
      hostNames: ['host-2', 'host-1'],
    });
    expect(rendering.cells[0].startMs).toBeLessThanOrEqual(T0);
    expect(rendering.cells[0].endMs).toBeGreaterThan(T0 + 3 * MINUTE);
  });

  it('switches back to points when the window zooms into the bucket', () => {
    const [row] = buildAlertRows(
      Array.from({ length: 5 }, (_, i) => alert(`a${i}`, T0 + i * 10 * MINUTE))
    );
    const zoomed = renderAlertRow(row, { startMs: T0, endMs: T0 + HOUR }, 1000);
    expect(zoomed.kind).toBe('points');
  });

  it('only counts alerts inside the window', () => {
    const [row] = buildAlertRows([alert('in', T0 + HOUR), alert('out', T0 - HOUR)]);
    const rendering = renderAlertRow(row, window, 100);
    expect(rendering.kind === 'points' && rendering.points.map(({ alert: a }) => a.id)).toEqual([
      'in',
    ]);
  });

  it('offsets points that would overlap', () => {
    const [row] = buildAlertRows([
      alert('a', T0),
      alert('b', T0 + 1000),
      alert('c', T0 + 50 * HOUR),
    ]);
    const rendering = renderAlertRow(row, window, 1000);
    expect(rendering.kind === 'points' && rendering.points.map(({ stack }) => stack)).toEqual([
      0, 1, 0,
    ]);
  });
});

describe('parseTimelineEntries and buildEntryRows', () => {
  const attachment = (
    id: string,
    data: unknown,
    type = INCIDENT_TIMELINE_ENTRY_ATTACHMENT_TYPE
  ) => ({
    id,
    version: 'v1',
    type,
    data,
    createdBy: { username: 'elastic', fullName: null },
  });

  it('keeps valid entries only and orders rows by category', () => {
    const entries = parseTimelineEntries([
      attachment('info', {
        title: 'Channel',
        occurredAt: iso(T0),
        endAt: iso(T0 + HOUR),
        category: 'info',
      }),
      attachment('none', { title: 'No category', occurredAt: iso(T0) }),
      attachment('actor-late', { title: 'Late', occurredAt: iso(T0 + HOUR), category: 'actor' }),
      attachment('actor-early', { title: 'Early', occurredAt: iso(T0), category: 'actor' }),
      attachment('broken', { title: 'No time' }),
      attachment('comment', { content: 'hello' }, 'comment'),
    ]);

    const rows = buildEntryRows(entries);

    expect(rows.map(({ category, entries: e }) => [category, e.map(({ id }) => id)])).toEqual([
      ['actor', ['actor-early', 'actor-late']],
      ['info', ['info']],
      ['uncategorized', ['none']],
    ]);
    expect(rows[1].entries[0]).toMatchObject({ endMs: T0 + HOUR, createdBy: 'elastic' });
  });
});

describe('buildTimelineModel', () => {
  const base = {
    createdAtMs: T0 + 10 * MINUTE,
    createdBy: 'creator',
    statusChanges: [],
    entries: [],
    nowMs: T0 + 100 * HOUR,
    showAllRules: false,
  };

  it('pads the default window around alerts, case creation and close', () => {
    const model = buildTimelineModel({
      ...base,
      closedAtMs: T0 + 100 * MINUTE,
      alerts: [alert('first', T0)],
    });
    const pad = 100 * MINUTE * TIMELINE_DENSITY.windowPadRatio;
    expect(model.window).toEqual({ startMs: T0 - pad, endMs: T0 + 100 * MINUTE + pad });
  });

  it('runs the default window of an open case to now and includes entry ends', () => {
    const model = buildTimelineModel({
      ...base,
      alerts: [],
      entries: parseTimelineEntries([
        {
          id: 'e',
          version: 'v',
          type: INCIDENT_TIMELINE_ENTRY_ATTACHMENT_TYPE,
          data: { title: 'Range', occurredAt: iso(T0), endAt: iso(T0 + 200 * HOUR) },
        },
      ]),
    });
    const pad = 200 * HOUR * TIMELINE_DENSITY.windowPadRatio;
    expect(model.window).toEqual({ startMs: T0 - pad, endMs: T0 + 200 * HOUR + pad });
  });

  it('counts reopens and every plotted alert, hidden rules included', () => {
    const alerts = Array.from({ length: TIMELINE_DENSITY.maxAlertRows + 2 }, (_, i) =>
      alert(`a${i}`, T0 + i * MINUTE, { ruleId: `rule-${i}`, ruleName: `Rule ${i}` })
    );
    const model = buildTimelineModel({
      ...base,
      alerts,
      statusChanges: [
        change(CaseStatuses.closed, T0 + HOUR),
        change(CaseStatuses['in-progress'], T0 + 2 * HOUR),
        change(CaseStatuses.closed, T0 + 3 * HOUR),
        change(CaseStatuses.open, T0 + 4 * HOUR),
      ],
    });
    expect(model.reopenCount).toBe(2);
    expect(model.alertCount).toBe(TIMELINE_DENSITY.maxAlertRows + 2);
  });

  it('hides rules past maxAlertRows until all rules are shown', () => {
    const alerts = Array.from({ length: TIMELINE_DENSITY.maxAlertRows + 2 }, (_, i) =>
      alert(`a${i}`, T0 + i * MINUTE, { ruleId: `rule-${i}`, ruleName: `Rule ${i}` })
    );

    const collapsed = buildTimelineModel({ ...base, alerts });
    expect(collapsed.alertRows).toHaveLength(TIMELINE_DENSITY.maxAlertRows);
    expect(collapsed.hiddenRuleCount).toBe(2);

    const expanded = buildTimelineModel({ ...base, alerts, showAllRules: true });
    expect(expanded.alertRows).toHaveLength(TIMELINE_DENSITY.maxAlertRows + 2);
    expect(expanded.hiddenRuleCount).toBe(0);
  });
});

describe('buildDiscoverParams', () => {
  it('queries the case id over the alert indices and pads the alert range', () => {
    const params = buildDiscoverParams({
      caseId: 'case-1',
      caseTitle: 'Chain',
      dataViewName: (title) => `Alerts in case ${title}`,
      alerts: [
        alert('a', T0, { index: 'idx-b', timestamp: iso(T0 + 10 * 1000) }),
        alert('b', T0 + 100 * MINUTE, { index: 'idx-a', timestamp: iso(T0 + 101 * MINUTE) }),
      ],
    });

    const pad = 101 * MINUTE * 0.05;
    expect(params).toEqual({
      dataViewSpec: {
        title: 'idx-a,idx-b',
        timeFieldName: '@timestamp',
        name: 'Alerts in case Chain',
      },
      query: { language: 'kuery', query: 'kibana.alert.case_ids: "case-1"' },
      timeRange: { from: iso(T0 - pad), to: iso(T0 + 101 * MINUTE + pad) },
      columns: [
        'kibana.alert.original_time',
        'kibana.alert.rule.name',
        'host.name',
        'user.name',
        'kibana.alert.workflow_status',
      ],
      sort: [['kibana.alert.original_time', 'asc']],
    });
  });

  it('pads a single alert by at least one minute', () => {
    const params = buildDiscoverParams({
      caseId: 'case-1',
      caseTitle: 'One',
      dataViewName: (title) => title,
      alerts: [alert('a', T0, { timestamp: iso(T0) })],
    });
    expect(params?.timeRange).toEqual({ from: iso(T0 - MINUTE), to: iso(T0 + MINUTE) });
  });

  it('returns nothing without alerts', () => {
    expect(
      buildDiscoverParams({ caseId: 'c', caseTitle: 't', dataViewName: (t) => t, alerts: [] })
    ).toBeUndefined();
  });
});
