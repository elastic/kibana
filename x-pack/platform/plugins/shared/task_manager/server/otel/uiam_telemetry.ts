/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Attributes, type Counter, metrics, ValueType } from '@opentelemetry/api';

/**
 * Why a task run fell back to the Elasticsearch API key instead of a UIAM key.
 * These are orthogonal reasons for the same event, so they live as an attribute
 * on a single counter (summing across them yields the total ES-key fallbacks).
 */
export type UiamApiKeyFallbackReason = 'user_created_key' | 'unexpected';

class TaskManagerUiamTelemetry {
  private readonly meter = metrics.getMeter('kibana.task_manager');

  private readonly uiamApiKeyFallbackCounter: Counter<Attributes>;

  constructor() {
    this.uiamApiKeyFallbackCounter = this.meter.createCounter(
      'kibana.task_manager.task_run.uiam_api_key_fallback.count',
      {
        description:
          'Number of task runs that fell back to the Elasticsearch API key because no UIAM API key was available.',
        unit: '1',
        valueType: ValueType.INT,
      }
    );
  }

  recordUiamApiKeyFallback = (reason: UiamApiKeyFallbackReason) => {
    this.uiamApiKeyFallbackCounter.add(1, { 'fallback.reason': reason });
  };
}

export const taskManagerUiamTelemetry = new TaskManagerUiamTelemetry();
