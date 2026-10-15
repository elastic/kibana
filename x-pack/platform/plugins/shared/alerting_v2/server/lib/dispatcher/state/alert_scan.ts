/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Alert } from '../types';

/**
 * Result of the windowed candidate-alert scan (FetchAlertsStep): the fetched
 * rows plus whether the scan hit ESQL_QUERY_ROW_LIMIT and deferred a tail.
 */
export class AlertScan {
  private static readonly EMPTY = new AlertScan([], false);

  private constructor(
    public readonly alerts: readonly Alert[],
    /** True when the scan reached ESQL_QUERY_ROW_LIMIT and a tail was deferred. */
    public readonly truncated: boolean
  ) {}

  public static of({
    alerts,
    truncated = false,
  }: {
    alerts: readonly Alert[];
    truncated?: boolean;
  }): AlertScan {
    return new AlertScan(alerts, truncated);
  }

  public static empty(): AlertScan {
    return AlertScan.EMPTY;
  }

  public isEmpty(): boolean {
    return this.alerts.length === 0;
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
