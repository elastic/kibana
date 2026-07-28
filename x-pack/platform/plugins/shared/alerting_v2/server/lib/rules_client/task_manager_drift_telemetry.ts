/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Attributes, type Counter, metrics, ValueType } from '@opentelemetry/api';

/**
 * The bulk rule operation during which the divergence was observed. These are
 * orthogonal dimensions of the same event (summing across them yields the total
 * number of drifted rules), so they live as an attribute on a single counter.
 */
export type TaskManagerDriftOperation = 'delete' | 'enable' | 'disable';

/**
 * Counts rules whose Task Manager state diverged from their saved object during
 * a bulk operation because the paired Task Manager call failed. Monitoring can
 * alert on the rate of this counter to catch systemic drift.
 */
class RulesTaskManagerDriftTelemetry {
  private readonly meter = metrics.getMeter('kibana.alerting_v2');

  private readonly driftCounter: Counter<Attributes>;

  constructor() {
    this.driftCounter = this.meter.createCounter(
      'kibana.alerting_v2.rules.task_manager_drift.count',
      {
        description:
          'Number of rules whose Task Manager state diverged from the rule saved object during a bulk operation because a Task Manager call failed.',
        unit: '1',
        valueType: ValueType.INT,
      }
    );
  }

  public recordDrift(operation: TaskManagerDriftOperation, count: number): void {
    if (count <= 0) {
      return;
    }
    this.driftCounter.add(count, { 'alerting_v2.bulk_operation': operation });
  }
}

export const rulesTaskManagerDriftTelemetry = new RulesTaskManagerDriftTelemetry();
