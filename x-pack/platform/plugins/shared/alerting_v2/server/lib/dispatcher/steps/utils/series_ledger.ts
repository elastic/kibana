/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertActionDocument } from '../../../../resources/datastreams/alert_actions';
import type { AlertTriage, DispatchPlan } from '../../state';
import type { ActionGroup, ActionGroupId, Alert } from '../../types';
import { toAction } from './action_documents';
import { suppressionSeriesKey } from './suppression_key';

interface SeriesRecords {
  docs: AlertActionDocument[];
  pending: number;
  released: boolean;
}

/**
 * Holds the alert-scoped `.alert-actions` records of a tick until they are safe to write.
 * `fire`, `suppress` and `unmatched` carry no `alert_id` and the scan dedups them per
 * (subject, group_hash), so one record hides every policy and every episode of the series:
 * a series' records are released only once every (toDispatch group, alert) pair of it concluded.
 */
export class SeriesLedger {
  private readonly concluded = new Map<ActionGroupId, ActionGroup>();

  private constructor(
    private readonly recordsBySeries: ReadonlyMap<string, SeriesRecords>,
    private readonly toDispatch: ReadonlyMap<ActionGroupId, ActionGroup>
  ) {}

  public static of({ triage, plan }: { triage: AlertTriage; plan: DispatchPlan }): SeriesLedger {
    const recordsBySeries = new Map<string, SeriesRecords>();
    const record = (
      alert: Alert,
      actionType: 'suppress' | 'fire' | 'unmatched',
      reason: string
    ): SeriesRecords => {
      const key = suppressionSeriesKey(alert);
      let records = recordsBySeries.get(key);
      if (!records) {
        records = { docs: [], pending: 0, released: false };
        recordsBySeries.set(key, records);
      }
      records.docs.push(toAction({ alert, actionType, reason, spaceId: alert.space_id }));
      return records;
    };

    for (const alert of triage.suppressed) {
      record(alert, 'suppress', alert.reason);
    }
    for (const { policyId, alerts } of plan.throttled) {
      for (const alert of alerts) {
        record(alert, 'suppress', `suppressed by throttled policy ${policyId}`);
      }
    }
    for (const { policyId, alerts } of plan.toDispatch) {
      for (const alert of alerts) {
        record(alert, 'fire', `dispatched by policy ${policyId}`).pending += 1;
      }
    }
    for (const { policyId, alerts } of plan.alreadyNotified) {
      for (const alert of alerts) {
        record(alert, 'fire', `already notified by policy ${policyId}`);
      }
    }
    for (const alert of plan.unmatched) {
      record(alert, 'unmatched', 'no matching action policy');
    }

    return new SeriesLedger(
      recordsBySeries,
      new Map(plan.toDispatch.map((group) => [group.id, group]))
    );
  }

  public isEmpty(): boolean {
    return this.recordsBySeries.size === 0 && this.toDispatch.size === 0;
  }

  public takeReady(): AlertActionDocument[] {
    const docs: AlertActionDocument[] = [];
    for (const records of this.recordsBySeries.values()) {
      if (records.pending === 0 && !records.released) {
        records.released = true;
        docs.push(...records.docs);
      }
    }
    return docs;
  }

  public conclude(groups: readonly ActionGroup[]): AlertActionDocument[] {
    const docs: AlertActionDocument[] = [];
    for (const { id } of groups) {
      const group = this.toDispatch.get(id);
      if (!group || this.concluded.has(id)) {
        continue;
      }
      this.concluded.set(id, group);
      for (const alert of group.alerts) {
        const records = this.recordsBySeries.get(suppressionSeriesKey(alert));
        if (!records) {
          continue;
        }
        records.pending -= 1;
        if (records.pending === 0) {
          records.released = true;
          docs.push(...records.docs);
        }
      }
    }
    return docs;
  }

  public hasPending(): boolean {
    return this.concluded.size < this.toDispatch.size;
  }

  public concludedGroups(): ActionGroup[] {
    return [...this.concluded.values()];
  }

  public releasedGroups(groups: readonly ActionGroup[]): ActionGroup[] {
    return groups.flatMap((group) => {
      const alerts = this.releasedAlerts(group.alerts);
      return alerts.length > 0 ? [{ ...group, alerts }] : [];
    });
  }

  public releasedAlerts(alerts: readonly Alert[]): Alert[] {
    return alerts.filter(
      (alert) => this.recordsBySeries.get(suppressionSeriesKey(alert))?.released ?? false
    );
  }
}
