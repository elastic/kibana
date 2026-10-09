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
  private readonly concluded: ActionGroup[] = [];
  private readonly concludedIds = new Set<ActionGroupId>();

  private constructor(
    private readonly recordsBySeries: ReadonlyMap<string, SeriesRecords>,
    private readonly toDispatch: ReadonlyMap<ActionGroupId, ActionGroup>,
    private readonly empty: boolean
  ) {}

  public static of({ triage, plan }: { triage: AlertTriage; plan: DispatchPlan }): SeriesLedger {
    const recordsBySeries = new Map<string, SeriesRecords>();
    const record = (alert: Alert, doc: AlertActionDocument): SeriesRecords => {
      const key = suppressionSeriesKey(alert);
      let records = recordsBySeries.get(key);
      if (!records) {
        records = { docs: [], pending: 0, released: false };
        recordsBySeries.set(key, records);
      }
      records.docs.push(doc);
      return records;
    };

    for (const alert of triage.suppressed) {
      record(
        alert,
        toAction({ alert, actionType: 'suppress', reason: alert.reason, spaceId: alert.space_id })
      );
    }
    for (const group of plan.throttled) {
      for (const alert of group.alerts) {
        record(
          alert,
          toAction({
            alert,
            actionType: 'suppress',
            reason: `suppressed by throttled policy ${group.policyId}`,
            spaceId: alert.space_id,
          })
        );
      }
    }
    for (const group of plan.toDispatch) {
      for (const alert of group.alerts) {
        const records = record(
          alert,
          toAction({
            alert,
            actionType: 'fire',
            reason: `dispatched by policy ${group.policyId}`,
            spaceId: alert.space_id,
          })
        );
        records.pending += 1;
      }
    }
    for (const group of plan.alreadyNotified) {
      for (const alert of group.alerts) {
        record(
          alert,
          toAction({
            alert,
            actionType: 'fire',
            reason: `already notified by policy ${group.policyId}`,
            spaceId: alert.space_id,
          })
        );
      }
    }
    for (const alert of plan.unmatched) {
      record(
        alert,
        toAction({
          alert,
          actionType: 'unmatched',
          reason: 'no matching action policy',
          spaceId: alert.space_id,
        })
      );
    }

    return new SeriesLedger(
      recordsBySeries,
      new Map(plan.toDispatch.map((group) => [group.id, group])),
      triage.suppressed.length === 0 && plan.isEmpty() && plan.unmatched.length === 0
    );
  }

  public isEmpty(): boolean {
    return this.empty;
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
      if (!group || this.concludedIds.has(id)) {
        continue;
      }
      this.concludedIds.add(id);
      this.concluded.push(group);
      for (const alert of group.alerts) {
        const records = this.recordsBySeries.get(suppressionSeriesKey(alert));
        if (!records) {
          continue;
        }
        records.pending -= 1;
        if (records.pending === 0 && !records.released) {
          records.released = true;
          docs.push(...records.docs);
        }
      }
    }
    return docs;
  }

  public hasPending(): boolean {
    return this.concludedIds.size < this.toDispatch.size;
  }

  public concludedGroups(): ActionGroup[] {
    return [...this.concluded];
  }

  public isReleased(alert: Alert): boolean {
    return this.recordsBySeries.get(suppressionSeriesKey(alert))?.released ?? false;
  }

  public releasedGroups(groups: readonly ActionGroup[]): ActionGroup[] {
    return groups.flatMap((group) => {
      const alerts = this.releasedAlerts(group.alerts);
      return alerts.length > 0 ? [{ ...group, alerts }] : [];
    });
  }

  public releasedAlerts(alerts: readonly Alert[]): Alert[] {
    return alerts.filter((alert) => this.isReleased(alert));
  }
}
