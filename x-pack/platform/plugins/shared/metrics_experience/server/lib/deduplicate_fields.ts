/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type MetricField } from '../types';

export function deduplicateFields(fields: MetricField[]): MetricField[] {
  const map = new Map<string, MetricField>();

  for (const field of fields) {
    const base = field.name.startsWith('metrics.') ? field.name.slice(8) : field.name;

    if (!map.has(base) || !field.name.startsWith('metrics.')) {
      map.set(base, { ...field, name: base });
    }
  }

  return Array.from(map.values());
}
