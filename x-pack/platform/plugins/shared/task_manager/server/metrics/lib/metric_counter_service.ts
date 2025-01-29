/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from '@kbn/utility-types';
import { Counter } from './counter';
import { unflattenObject } from './unflatten_object';

export class MetricCounterService<T extends JsonObject> {
  private readonly counters = new Map<string, Counter>();
  private readonly keys: string[];

  constructor(keys: string[], initialNamespace?: string) {
    if (!keys || !keys.length) {
      throw new Error('Metrics counter service must be initialized with at least one key');
    }

    this.keys = keys;
    this.initializeCountersForNamespace(initialNamespace);
  }

  public initialMetrics(): T {
    return this.toJson(true);
  }

  public reset() {
    this.counters.forEach((val: Counter) => {
      val.reset();
    });
  }

  public increment(key: string, namespace?: string) {
    // initialize counters for namespace if necessary
    this.initializeCountersForNamespace(namespace);

    // increment counter in specified namespace
    this.counters.get(this.buildCounterKey(key, namespace))?.increment();
  }

  public collect(): T {
    return this.toJson();
  }

  private initializeCountersForNamespace(namespace?: string) {
    for (const key of this.keys) {
      const counterKey = this.buildCounterKey(key, namespace);
      if (!this.counters.get(counterKey)) {
        this.counters.set(counterKey, new Counter());
      }
    }
  }

  private buildCounterKey(key: string, namespace?: string) {
    const prefix = namespace ? `${namespace}.` : '';
    return `${prefix}${key}`;
  }

  private toJson(initialMetric: boolean = false): T {
    const collected: Record<string, number> = {};
    this.counters.forEach((val: Counter, key: string) => {
      collected[key] = initialMetric ? val.initialCount() : val.get();
    });

    return unflattenObject(collected);
  }
}
