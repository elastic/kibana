/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonObject } from '@kbn/utility-types';
export declare class MetricCounterService<T extends JsonObject> {
  private readonly counters;
  private readonly keys;
  constructor(keys: string[], initialNamespace?: string);
  initialMetrics(): T;
  reset(): void;
  increment(key: string, namespace?: string): void;
  collect(): T;
  private initializeCountersForNamespace;
  private buildCounterKey;
  private toJson;
}
