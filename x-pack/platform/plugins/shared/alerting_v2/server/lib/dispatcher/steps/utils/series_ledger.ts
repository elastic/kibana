/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  alertActionSubtype,
  type AlertActionDocument,
} from '../../../../resources/datastreams/alert_actions';
import type { AlertTriage, DispatchPlan } from '../../state';
import type { ActionGroup, ActionGroupId, Alert } from '../../types';
import { toAction } from './action_documents';
import { suppressionSeriesKey } from './suppression_key';

/** The records of one series, held until the series has nothing left to dispatch. */
interface SeriesRecords {
  /** `fire`, `suppress` and `unmatched` records of every policy and alert of the series. */
  docs: AlertActionDocument[];
  /** (toDispatch group, alert) pairs of the series not concluded yet; the docs wait for 0. */
  unconcludedPairs: number;
  /**
   * Whether the docs were handed out for writing, so they are handed out once. Handed out is not
   * written: execution history reports the series even when the commit then fails.
   */
  released: boolean;
}

interface DispatchEntry {
  group: ActionGroup;
  /** Series of each alert of the group, one entry per alert, so concluding needs no key lookup. */
  series: SeriesRecords[];
}

/**
 * Holds the series-level `.alert-actions` records of a tick until they are safe to write.
 * `fire`, `suppress` and `unmatched` carry no `alert_id` and the scan dedups them per
 * (subject, group_hash): one written record hides the whole series from the next tick. Writing it
 * while an alert of the series is still waiting for dispatch would lose that alert if the tick
 * aborts, so a series is released only once every (toDispatch group, alert) pair of it concluded.
 */
export class SeriesLedger {
  /** toDispatch groups that had their last schedule attempt, whether it succeeded or failed. */
  private readonly concluded = new Map<ActionGroupId, ActionGroup>();

  /**
   * @param recordsBySeries records of every series of the tick, keyed by `suppressionSeriesKey`.
   * @param toDispatch planned dispatch groups, with the series each of their alerts waits on.
   */
  private constructor(
    private readonly recordsBySeries: ReadonlyMap<string, SeriesRecords>,
    private readonly toDispatch: ReadonlyMap<ActionGroupId, DispatchEntry>
  ) {}

  public static of({ triage, plan }: { triage: AlertTriage; plan: DispatchPlan }): SeriesLedger {
    const recordsBySeries = new Map<string, SeriesRecords>();
    const record = (
      alert: Alert,
      actionType: 'suppress' | 'fire' | 'unmatched',
      reason: string,
      details: Pick<Parameters<typeof toAction>[0], 'actionSubtype' | 'maintenanceWindowId'> = {}
    ): SeriesRecords => {
      const key = suppressionSeriesKey(alert);
      let records = recordsBySeries.get(key);
      if (!records) {
        records = { docs: [], unconcludedPairs: 0, released: false };
        recordsBySeries.set(key, records);
      }
      records.docs.push(
        toAction({ alert, actionType, reason, spaceId: alert.space_id, ...details })
      );
      return records;
    };

    for (const alert of triage.suppressed) {
      record(alert, 'suppress', alert.reason, {
        actionSubtype: alert.action_subtype,
        maintenanceWindowId: alert.maintenance_window_id,
      });
    }
    for (const { policyId, alerts } of plan.throttled) {
      for (const alert of alerts) {
        record(alert, 'suppress', `suppressed by throttled policy ${policyId}`, {
          actionSubtype: alertActionSubtype.throttled,
        });
      }
    }
    // Only toDispatch alerts hold their series back: every other record describes a decision
    // already final this tick, including already-notified alerts, which still need `last_fired`.
    const toDispatch = new Map<ActionGroupId, DispatchEntry>();
    for (const group of plan.toDispatch) {
      const series = group.alerts.map((alert) => {
        const records = record(alert, 'fire', `dispatched by policy ${group.policyId}`);
        records.unconcludedPairs += 1;
        return records;
      });
      toDispatch.set(group.id, { group, series });
    }
    for (const { policyId, alerts } of plan.alreadyNotified) {
      for (const alert of alerts) {
        record(alert, 'fire', `already notified by policy ${policyId}`);
      }
    }
    for (const alert of plan.unmatched) {
      record(alert, 'unmatched', 'no matching action policy');
    }

    return new SeriesLedger(recordsBySeries, toDispatch);
  }

  public isEmpty(): boolean {
    return this.recordsBySeries.size === 0 && this.toDispatch.size === 0;
  }

  /** Hands out the records of every series no toDispatch group waits on. */
  public takeReady(): AlertActionDocument[] {
    const docs: AlertActionDocument[] = [];
    for (const records of this.recordsBySeries.values()) {
      if (records.unconcludedPairs === 0 && !records.released) {
        records.released = true;
        docs.push(...records.docs);
      }
    }
    return docs;
  }

  /**
   * Marks `groups` as concluded and hands out the records of the series that no longer wait on
   * any group. Unknown and already concluded groups are skipped so a pair is never counted twice.
   */
  public conclude(groups: readonly ActionGroup[]): AlertActionDocument[] {
    const docs: AlertActionDocument[] = [];
    for (const { id } of groups) {
      const entry = this.toDispatch.get(id);
      if (!entry || this.concluded.has(id)) {
        continue;
      }
      this.concluded.set(id, entry.group);
      for (const records of entry.series) {
        records.unconcludedPairs -= 1;
        if (records.unconcludedPairs === 0) {
          records.released = true;
          docs.push(...records.docs);
        }
      }
    }
    return docs;
  }

  /** Whether a toDispatch group was never attempted, so the tick must not advance past it. */
  public hasUnattemptedGroups(): boolean {
    return this.concluded.size < this.toDispatch.size;
  }

  public concludedGroups(): ActionGroup[] {
    return [...this.concluded.values()];
  }

  /** Narrows `groups` to the alerts whose series records were handed out, dropping empty groups. */
  public releasedGroups(groups: readonly ActionGroup[]): ActionGroup[] {
    return groups.flatMap((group) => {
      const alerts = this.releasedAlerts(group.alerts);
      return alerts.length > 0 ? [{ ...group, alerts }] : [];
    });
  }

  /** Keeps the alerts whose series records were handed out, so history matches what was recorded. */
  public releasedAlerts(alerts: readonly Alert[]): Alert[] {
    return alerts.filter(
      (alert) => this.recordsBySeries.get(suppressionSeriesKey(alert))?.released ?? false
    );
  }
}
