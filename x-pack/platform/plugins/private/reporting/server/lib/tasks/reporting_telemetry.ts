/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type Attributes,
  type Counter,
  type Histogram,
  metrics,
  ValueType,
} from '@opentelemetry/api';
import type { RenderRetryAction, RenderRetryReason } from '@kbn/reporting-common';

/** The delivery targets — 95% within 4 minutes, 99% within 10 — are bucket boundaries. */
const DELIVERY_SECONDS_BUCKETS = [
  5, 10, 30, 60, 120, 180, 240, 300, 420, 600, 900, 1200, 1800, 3600,
];

class ReportingTelemetry {
  private readonly meter = metrics.getMeter('kibana.reporting');

  private readonly deliveryHistogram: Histogram<Attributes>;
  private readonly renderRetryCounter: Counter<Attributes>;

  constructor() {
    this.deliveryHistogram = this.meter.createHistogram('kibana.reporting.delivery.duration', {
      description:
        'Time from a report being created to it completing or failing for good, across every task run.',
      unit: 's',
      valueType: ValueType.DOUBLE,
      advice: { explicitBucketBoundaries: DELIVERY_SECONDS_BUCKETS },
    });
    this.renderRetryCounter = this.meter.createCounter('kibana.reporting.render.retries', {
      description:
        'Decisions the reporting task made about failed page-render-service requests, by reason and action.',
      unit: '1',
      valueType: ValueType.INT,
    });
  }

  recordDelivery = (
    seconds: number,
    attributes: { jobType: string; outcome: 'completed' | 'failed'; errorCode?: string }
  ) => {
    this.deliveryHistogram.record(seconds, {
      'reporting.job_type': attributes.jobType,
      'reporting.outcome': attributes.outcome,
      ...(attributes.errorCode ? { 'reporting.error_code': attributes.errorCode } : {}),
    });
  };

  recordRenderRetry = (reason: RenderRetryReason, action: RenderRetryAction) => {
    this.renderRetryCounter.add(1, {
      'reporting.retry.reason': reason,
      'reporting.retry.action': action,
    });
  };
}

export const reportingTelemetry = new ReportingTelemetry();
