/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createActionGroup, createAlert } from '../../fixtures/test_utils';
import { AlertTriage, DispatchPlan, type SuppressedAlert } from '../../state';
import type { ActionGroup, Alert } from '../../types';
import { SeriesLedger } from './series_ledger';

const buildLedger = ({
  suppressed = [],
  toDispatch = [],
  throttled = [],
  alreadyNotified = [],
  unmatched = [],
}: {
  suppressed?: SuppressedAlert[];
  toDispatch?: ActionGroup[];
  throttled?: ActionGroup[];
  alreadyNotified?: ActionGroup[];
  unmatched?: Alert[];
}): SeriesLedger =>
  SeriesLedger.of({
    triage: AlertTriage.of({ dispatchable: [], suppressed }),
    plan: DispatchPlan.of({
      toDispatch,
      throttled,
      alreadyNotified,
      dispatchable: [
        ...toDispatch.flatMap(({ alerts }) => alerts),
        ...throttled.flatMap(({ alerts }) => alerts),
        ...alreadyNotified.flatMap(({ alerts }) => alerts),
        ...unmatched,
      ],
    }),
  });

describe('SeriesLedger', () => {
  const alertA = createAlert({ alert_id: 'alert-a', group_hash: 'hash-a' });
  const alertB = createAlert({ alert_id: 'alert-b', group_hash: 'hash-b' });

  it('is empty when there is nothing to record', () => {
    expect(buildLedger({}).isEmpty()).toBe(true);
  });

  it.each([
    ['suppressed', { suppressed: [{ ...alertA, reason: 'ack', action_subtype: 'ack' as const }] }],
    ['throttled', { throttled: [createActionGroup({ alerts: [alertA] })] }],
    ['already notified', { alreadyNotified: [createActionGroup({ alerts: [alertA] })] }],
    ['unmatched', { unmatched: [alertA] }],
  ])('is not empty with only %s alerts', (_, buckets) => {
    expect(buildLedger(buckets).isEmpty()).toBe(false);
  });

  it('releases every series without a group to dispatch at once, with its reason and event time', () => {
    const alertC = createAlert({ alert_id: 'alert-c', group_hash: 'hash-c' });
    const alertD = createAlert({
      alert_id: 'alert-d',
      group_hash: 'hash-d',
      last_event_timestamp: '2026-01-22T07:12:00.000Z',
    });
    const ledger = buildLedger({
      suppressed: [{ ...alertA, reason: 'snoozed', action_subtype: 'snooze' }],
      throttled: [createActionGroup({ id: 'g-t', policyId: 'p-t', alerts: [alertB] })],
      alreadyNotified: [createActionGroup({ id: 'g-n', policyId: 'p-n', alerts: [alertC] })],
      unmatched: [alertD],
    });

    expect(ledger.takeReady()).toEqual([
      {
        actor: { type: 'internal' },
        action_type: 'suppress',
        action_subtype: 'snooze',
        group_hash: 'hash-a',
        rule_id: 'rule-1',
        source: 'internal',
        space_id: 'default',
        last_series_event_timestamp: alertA.last_event_timestamp,
        reason: 'snoozed',
      },
      expect.objectContaining({
        group_hash: 'hash-b',
        action_type: 'suppress',
        action_subtype: 'throttled',
        reason: 'suppressed by throttled policy p-t',
      }),
      expect.objectContaining({
        group_hash: 'hash-c',
        action_type: 'fire',
        reason: 'already notified by policy p-n',
      }),
      expect.objectContaining({
        group_hash: 'hash-d',
        action_type: 'unmatched',
        reason: 'no matching action policy',
        last_series_event_timestamp: '2026-01-22T07:12:00.000Z',
      }),
    ]);
    expect(ledger.takeReady()).toEqual([]);
    expect(ledger.hasUnattemptedGroups()).toBe(false);
  });

  it('holds the fire record of a dispatched alert until its group concludes', () => {
    const group = createActionGroup({ id: 'g1', policyId: 'p1', alerts: [alertA] });
    const ledger = buildLedger({ toDispatch: [group] });

    expect(ledger.takeReady()).toEqual([]);
    expect(ledger.hasUnattemptedGroups()).toBe(true);

    expect(ledger.conclude([group])).toEqual([
      expect.objectContaining({
        group_hash: 'hash-a',
        action_type: 'fire',
        reason: 'dispatched by policy p1',
        last_series_event_timestamp: alertA.last_event_timestamp,
      }),
    ]);
    expect(ledger.hasUnattemptedGroups()).toBe(false);
    expect(ledger.concludedGroups()).toEqual([group]);
  });

  it('releases an alert shared by two groups only once both concluded', () => {
    const g1 = createActionGroup({ id: 'g1', policyId: 'p1', alerts: [alertA] });
    const g2 = createActionGroup({ id: 'g2', policyId: 'p2', alerts: [alertA] });
    const ledger = buildLedger({ toDispatch: [g1, g2] });

    expect(ledger.conclude([g1])).toEqual([]);
    expect(ledger.releasedAlerts([alertA])).toEqual([]);
    expect(ledger.conclude([g2])).toEqual([
      expect.objectContaining({ action_type: 'fire', reason: 'dispatched by policy p1' }),
      expect.objectContaining({ action_type: 'fire', reason: 'dispatched by policy p2' }),
    ]);
    expect(ledger.releasedAlerts([alertA])).toEqual([alertA]);
  });

  it('holds two episodes of one series until both of their groups concluded', () => {
    const olderEpisode = createAlert({ alert_id: 'episode-1', alert_status: 'inactive' });
    const newerEpisode = createAlert({ alert_id: 'episode-2', alert_status: 'active' });
    const g1 = createActionGroup({ id: 'g1', alerts: [newerEpisode] });
    const g2 = createActionGroup({ id: 'g2', alerts: [olderEpisode] });
    const ledger = buildLedger({ toDispatch: [g1, g2] });

    expect(ledger.conclude([g1])).toEqual([]);
    expect(ledger.conclude([g2])).toHaveLength(2);
  });

  it('releases only the series of an aggregated group that no unattempted group shares', () => {
    const aggregated = createActionGroup({ id: 'g-all', alerts: [alertA, alertB] });
    const unattempted = createActionGroup({ id: 'g-other', alerts: [alertB] });
    const ledger = buildLedger({ toDispatch: [aggregated, unattempted] });

    expect(ledger.conclude([aggregated])).toEqual([
      expect.objectContaining({ group_hash: 'hash-a', action_type: 'fire' }),
    ]);
    expect(ledger.hasUnattemptedGroups()).toBe(true);
  });

  it('holds a throttled record while its series still has a group to dispatch', () => {
    const dispatched = createActionGroup({ id: 'g1', policyId: 'p1', alerts: [alertA] });
    const throttled = createActionGroup({ id: 'g2', policyId: 'p2', alerts: [alertA] });
    const ledger = buildLedger({ toDispatch: [dispatched], throttled: [throttled] });

    expect(ledger.takeReady()).toEqual([]);
    expect(ledger.conclude([dispatched])).toEqual([
      expect.objectContaining({
        action_type: 'suppress',
        reason: 'suppressed by throttled policy p2',
      }),
      expect.objectContaining({ action_type: 'fire', reason: 'dispatched by policy p1' }),
    ]);
  });

  it('ignores a group concluded twice or not planned for dispatch', () => {
    const g1 = createActionGroup({ id: 'g1', alerts: [alertA] });
    const g2 = createActionGroup({ id: 'g2', alerts: [alertA] });
    const unplanned = createActionGroup({ id: 'g3', alerts: [alertA] });
    const ledger = buildLedger({ toDispatch: [g1, g2] });

    ledger.conclude([g1]);

    expect(ledger.conclude([g1, unplanned])).toEqual([]);
    expect(ledger.concludedGroups()).toEqual([g1]);
    expect(ledger.hasUnattemptedGroups()).toBe(true);
  });

  it('narrows groups and alerts to the released series', () => {
    const dispatched = createActionGroup({ id: 'g1', alerts: [alertA] });
    const throttled = createActionGroup({ id: 'g2', alerts: [alertA, alertB] });
    const ledger = buildLedger({ toDispatch: [dispatched], throttled: [throttled] });

    ledger.takeReady();

    expect(ledger.releasedAlerts([alertA, alertB])).toEqual([alertB]);
    expect(ledger.releasedGroups([throttled])).toEqual([{ ...throttled, alerts: [alertB] }]);
    expect(ledger.releasedGroups([createActionGroup({ id: 'g3', alerts: [alertA] })])).toEqual([]);
  });

  describe('records', () => {
    it('records every alert of a dispatched group', () => {
      const group = createActionGroup({
        id: 'group-1',
        policyId: 'policy-1',
        alerts: [
          createAlert({ rule_id: 'rule-1', group_hash: 'hash-1', alert_id: 'ep-1' }),
          createAlert({ rule_id: 'rule-1', group_hash: 'hash-2', alert_id: 'ep-2' }),
        ],
      });
      const ledger = buildLedger({ toDispatch: [group] });

      expect(ledger.conclude([group])).toEqual([
        expect.objectContaining({ action_type: 'fire', group_hash: 'hash-1' }),
        expect.objectContaining({ action_type: 'fire', group_hash: 'hash-2' }),
      ]);
    });

    it('records an external alert with its vendor source and no rule id', () => {
      const externalAlert = createAlert({
        rule_id: null,
        source: 'pagerduty',
        space_id: 'space-a',
        group_hash: 'pd-group-hash',
      });
      const group = createActionGroup({
        id: 'group-pd',
        policyId: 'policy-1',
        alerts: [externalAlert],
      });
      const ledger = buildLedger({ toDispatch: [group] });

      expect(ledger.conclude([group])).toEqual([
        expect.objectContaining({
          action_type: 'fire',
          source: 'pagerduty',
          rule_id: null,
          group_hash: 'pd-group-hash',
          space_id: 'space-a',
          actor: { type: 'internal' },
        }),
      ]);
    });

    it('takes the space_id of each record from its alert', () => {
      const ledger = buildLedger({
        suppressed: [
          {
            ...createAlert({ space_id: 'space-a', group_hash: 'hash-1' }),
            reason: 'suppressed',
            action_subtype: 'unknown',
          },
          {
            ...createAlert({ space_id: 'space-b', group_hash: 'hash-2' }),
            reason: 'suppressed',
            action_subtype: 'unknown',
          },
        ],
      });

      expect(ledger.takeReady().map(({ space_id: spaceId }) => spaceId)).toEqual([
        'space-a',
        'space-b',
      ]);
    });

    it('records the maintenance window id on a suppress record', () => {
      const ledger = buildLedger({
        suppressed: [
          {
            ...alertA,
            reason: 'maintenance_window:mw-1',
            action_subtype: 'maintenance_window',
            maintenance_window_id: 'mw-1',
          },
        ],
      });

      expect(ledger.takeReady()).toEqual([
        expect.objectContaining({
          action_type: 'suppress',
          action_subtype: 'maintenance_window',
          reason: 'maintenance_window:mw-1',
          maintenance_window_id: 'mw-1',
        }),
      ]);
    });

    it('omits maintenance_window_id and action_subtype where they do not apply', () => {
      const group = createActionGroup({ id: 'g1', alerts: [alertB] });
      const ledger = buildLedger({
        suppressed: [{ ...alertA, reason: 'ack', action_subtype: 'ack' }],
        toDispatch: [group],
        unmatched: [createAlert({ alert_id: 'alert-c', group_hash: 'hash-c' })],
      });

      const [suppress, unmatched] = ledger.takeReady();
      const [fire] = ledger.conclude([group]);

      expect(suppress).not.toHaveProperty('maintenance_window_id');
      expect(unmatched).not.toHaveProperty('action_subtype');
      expect(fire).not.toHaveProperty('action_subtype');
    });
  });
});
