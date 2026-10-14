/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { suppressionAlertKey, suppressionSeriesKey } from '../steps/utils/suppression_key';
import type { Alert, SuppressionRow } from '../types';

/**
 * Suppression facts loaded from `.alert-actions` (FetchSuppressionsStep),
 * indexed by alert- and series-scoped keys for per-alert lookup.
 */
export class SuppressionIndex {
  private static readonly EMPTY = new SuppressionIndex(new Map());

  private constructor(private readonly byKey: ReadonlyMap<string, SuppressionRow>) {}

  public static of(suppressions: readonly SuppressionRow[]): SuppressionIndex {
    const byKey = new Map<string, SuppressionRow>();
    for (const suppression of suppressions) {
      const { alert_id: alertId } = suppression;
      const key = alertId
        ? suppressionAlertKey({ ...suppression, alert_id: alertId })
        : suppressionSeriesKey(suppression);
      byKey.set(key, suppression);
    }
    return new SuppressionIndex(byKey);
  }

  public static empty(): SuppressionIndex {
    return SuppressionIndex.EMPTY;
  }

  public get size(): number {
    return this.byKey.size;
  }

  /**
   * Reason the alert must not notify, or undefined when it may dispatch.
   * An alert-scoped suppression wins over a series-scoped one.
   */
  public suppressionReasonFor(alert: Alert): string | undefined {
    const alertSuppression = this.byKey.get(suppressionAlertKey(alert));
    if (alertSuppression?.should_suppress) {
      return suppressionReason(alertSuppression);
    }
    const seriesSuppression = this.byKey.get(suppressionSeriesKey(alert));
    if (seriesSuppression?.should_suppress) {
      return suppressionReason(seriesSuppression);
    }
    return undefined;
  }
}

function suppressionReason(suppression: SuppressionRow): string {
  if (suppression.last_snooze_action === 'snooze') return 'snooze';
  if (suppression.last_ack_action === 'ack') return 'ack';
  if (suppression.last_deactivate_action === 'deactivate') return 'deactivate';
  return 'unknown suppression reason';
}
