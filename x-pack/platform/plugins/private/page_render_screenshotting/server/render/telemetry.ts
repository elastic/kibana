/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Attributes, type Histogram, metrics, ValueType } from '@opentelemetry/api';

/** The ladder's step points (60s, 240s, 600s) are boundaries. */
const CAPACITY_WAIT_SECONDS_BUCKETS = [1, 2.5, 5, 10, 30, 60, 120, 180, 240, 300, 420, 600, 900];

class PageRenderTelemetry {
  private readonly meter = metrics.getMeter('kibana.page_render_screenshotting');

  private readonly capacityWaitHistogram: Histogram<Attributes>;

  constructor() {
    this.capacityWaitHistogram = this.meter.createHistogram(
      'kibana.reporting.render.capacity_wait.duration',
      {
        description:
          'Time a render waited for page-render-service to accept it, across every retry and task run: from the report being created, or from the last failed render.',
        unit: 's',
        valueType: ValueType.DOUBLE,
        advice: { explicitBucketBoundaries: CAPACITY_WAIT_SECONDS_BUCKETS },
      }
    );
  }

  recordCapacityWait = (seconds: number) => {
    this.capacityWaitHistogram.record(seconds);
  };
}

export const pageRenderTelemetry = new PageRenderTelemetry();
