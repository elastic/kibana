/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Alert } from '../types';

/**
 * Result of the windowed candidate-alert scan (FetchAlertsStep): the fetched
 * rows plus whether a tail of the window was deferred to the next tick.
 */
export class AlertScan {
  private static readonly EMPTY = new AlertScan([], false, false);

  private constructor(
    public readonly alerts: readonly Alert[],
    /**
     * True when a tail was deferred: the scan reached `dispatcher.run.alerts.max`,
     * or a later step narrowed it with `withDeferredTail`.
     */
    public readonly truncated: boolean,
    /**
     * True when a later step deferred some fetched alerts to the next tick
     * (see `withDeferredTail`). Those alerts get no record this tick, so the
     * watermark must stop at the truncation edge whatever the tick outcome.
     */
    public readonly deferred: boolean
  ) {}

  public static of({
    alerts,
    truncated = false,
  }: {
    alerts: readonly Alert[];
    truncated?: boolean;
  }): AlertScan {
    return new AlertScan(alerts, truncated, false);
  }

  public static empty(): AlertScan {
    return AlertScan.EMPTY;
  }

  public isEmpty(): boolean {
    return this.alerts.length === 0;
  }

  /**
   * Narrows the scan to the alerts before the first deferred one, after a step
   * deferred some alerts to the next tick. Rows are sorted ascending, so the
   * truncation edge cannot pass a deferred alert. Kept alerts after the cut
   * may still be dispatched; they are only left out of the watermark's scan.
   */
  public withDeferredTail(isDeferred: (alert: Alert) => boolean): AlertScan {
    const cut = this.alerts.findIndex(isDeferred);
    const kept = cut === -1 ? this.alerts : this.alerts.slice(0, cut);
    return new AlertScan(kept, true, true);
  }

  /**
   * Timestamp of the last fetched alert — rows arrive sorted ascending, so
   * this is the truncation edge the watermark advances to on a truncated tick.
   * A corrupt timestamp yields an Invalid Date rather than throwing; callers
   * must clamp or guard against it.
   */
  public truncationEdge(): Date | undefined {
    const lastAlert = this.alerts[this.alerts.length - 1];
    return lastAlert ? new Date(lastAlert.last_event_timestamp) : undefined;
  }
}
