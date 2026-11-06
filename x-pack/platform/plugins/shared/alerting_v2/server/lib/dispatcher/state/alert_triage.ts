/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertActionSubtype } from '../../../resources/datastreams/alert_actions';
import type { Alert, RuleId } from '../types';

export type SuppressedAlert = Alert & Suppression;

/** A suppression verdict. */
export interface Suppression {
  reason: string;
  action_subtype: AlertActionSubtype;
  maintenance_window_id?: string;
}

/**
 * The evolving verdict on candidate alerts: which may still notify
 * (`dispatchable`) and which must not (`suppressed`, with the reason).
 * Created by ApplySuppressionStep, enriched by HydrateAlertDataStep,
 * re-partitioned by ApplyMaintenanceWindowStep — each returns a new instance.
 */
export class AlertTriage {
  private static readonly EMPTY = new AlertTriage([], []);

  private constructor(
    public readonly dispatchable: readonly Alert[],
    public readonly suppressed: readonly SuppressedAlert[]
  ) {}

  public static of({
    dispatchable,
    suppressed,
  }: {
    dispatchable: readonly Alert[];
    suppressed: readonly SuppressedAlert[];
  }): AlertTriage {
    return new AlertTriage(dispatchable, suppressed);
  }

  public static empty(): AlertTriage {
    return AlertTriage.EMPTY;
  }

  /** Partition alerts: a returned suppression means "suppress". */
  public static partition(
    alerts: readonly Alert[],
    suppressionFor: (alert: Alert) => Suppression | undefined
  ): AlertTriage {
    return AlertTriage.EMPTY.suppressWhere(alerts, suppressionFor);
  }

  /**
   * Re-partition the dispatchable set: alerts with a reason move to
   * `suppressed` (appended after the already-suppressed ones), the rest stay
   * dispatchable. Returns `this` unchanged when nothing was newly suppressed,
   * so callers can detect a no-op by identity.
   */
  public suppressDispatchableWhere(
    suppressionFor: (alert: Alert) => Suppression | undefined
  ): AlertTriage {
    return this.suppressWhere(this.dispatchable, suppressionFor);
  }

  /** Replace each dispatchable alert 1:1 (e.g. `data` enrichment). */
  public mapDispatchable(fn: (alert: Alert) => Alert): AlertTriage {
    return new AlertTriage(this.dispatchable.map(fn), this.suppressed);
  }

  public hasDispatchable(): boolean {
    return this.dispatchable.length > 0;
  }

  public dispatchableAlertIds(): string[] {
    const ids = new Set<string>();
    for (const alert of this.dispatchable) {
      ids.add(alert.alert_id);
    }
    return Array.from(ids);
  }

  public dispatchableRuleIds(): RuleId[] {
    const ids = new Set<RuleId>();
    for (const alert of this.dispatchable) {
      if (alert.rule_id !== null) {
        ids.add(alert.rule_id);
      }
    }
    return Array.from(ids);
  }

  private suppressWhere(
    alerts: readonly Alert[],
    suppressionFor: (alert: Alert) => Suppression | undefined
  ): AlertTriage {
    const dispatchable: Alert[] = [];
    // Only copied on the first newly suppressed alert, so a tick where
    // nothing matches allocates no suppressed array and returns `this`.
    let suppressed: SuppressedAlert[] | undefined;

    for (const alert of alerts) {
      const suppression = suppressionFor(alert);
      if (suppression !== undefined) {
        suppressed ??= [...this.suppressed];
        suppressed.push({ ...alert, ...suppression });
      } else {
        dispatchable.push(alert);
      }
    }

    if (suppressed === undefined && alerts === this.dispatchable) {
      return this;
    }

    return new AlertTriage(dispatchable, suppressed ?? this.suppressed);
  }
}
