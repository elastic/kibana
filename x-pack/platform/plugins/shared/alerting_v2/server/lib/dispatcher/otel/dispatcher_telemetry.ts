/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Counter, metrics, ValueType } from '@opentelemetry/api';
import { createToken } from '@kbn/core-di';
import { injectable } from 'inversify';

export const ALERT_SCAN_TRUNCATED_METRIC =
  'kibana.alerting_v2.dispatcher.alert_scan_truncated.count';

export const OVERSIZED_ALERT_DATA_SKIPPED_METRIC =
  'kibana.alerting_v2.dispatcher.oversized_alert_data_skipped.count';

export interface DispatcherTelemetryContract {
  recordAlertScanTruncated(): void;
  recordOversizedAlertDataSkipped(count: number): void;
}

export const DispatcherTelemetryToken = createToken<DispatcherTelemetryContract>(
  'alerting_v2.DispatcherTelemetry'
);

/**
 * OTel metrics for the dispatcher. Bound as a singleton so the meter and its
 * instruments are created once per process.
 */
@injectable()
export class DispatcherTelemetry implements DispatcherTelemetryContract {
  private readonly meter = metrics.getMeter('kibana.alerting_v2');
  private readonly alertScanTruncatedCounter: Counter;
  private readonly oversizedAlertDataSkippedCounter: Counter;

  constructor() {
    this.alertScanTruncatedCounter = this.meter.createCounter(ALERT_SCAN_TRUNCATED_METRIC, {
      description:
        'Number of dispatcher ticks whose alert scan returned xpack.alerting_v2.dispatcher.run.alerts.max rows. The tail is deferred to the next tick, so a sustained rate means the dispatcher is falling behind.',
      unit: '1',
      valueType: ValueType.INT,
    });
    this.oversizedAlertDataSkippedCounter = this.meter.createCounter(
      OVERSIZED_ALERT_DATA_SKIPPED_METRIC,
      {
        description:
          'Number of alerts dispatched without their data because it alone exceeded xpack.alerting_v2.dispatcher.run.hydration.maxResponseSize. data.* matchers and maintenance-window filters do not match these alerts.',
        unit: '1',
        valueType: ValueType.INT,
      }
    );
  }

  public recordAlertScanTruncated(): void {
    // @otel: kibana.alerting_v2.dispatcher.alert_scan_truncated.count
    this.alertScanTruncatedCounter.add(1);
  }

  public recordOversizedAlertDataSkipped(count: number): void {
    // @otel: kibana.alerting_v2.dispatcher.oversized_alert_data_skipped.count
    this.oversizedAlertDataSkippedCounter.add(count);
  }
}
