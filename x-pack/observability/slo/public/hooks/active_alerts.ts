/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE, SLOResponse } from '@kbn/slo-schema';

type SLO = Pick<SLOResponse, 'id' | 'instanceId'>;
export class ActiveAlerts {
  private data: Map<string, number> = new Map();

  constructor(initialData?: Record<string, number>) {
    if (initialData) {
      Object.keys(initialData).forEach((key) => this.data.set(key, initialData[key]));
    }
  }

  set(slo: SLO, value: number) {
    this.data.set(`${slo.id}|${slo.instanceId ?? ALL_VALUE}`, value);
  }

  get(slo: SLO) {
    return this.data.get(`${slo.id}|${slo.instanceId ?? ALL_VALUE}`);
  }

  has(slo: SLO) {
    return this.data.has(`${slo.id}|${slo.instanceId ?? ALL_VALUE}`);
  }

  delete(slo: SLO) {
    return this.data.delete(`${slo.id}|${slo.instanceId ?? ALL_VALUE}`);
  }

  clear() {
    return this.data.clear();
  }
}
