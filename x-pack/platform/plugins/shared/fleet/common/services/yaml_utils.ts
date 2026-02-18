/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Pair } from 'yaml';
import { Document, isScalar } from 'yaml';

/**
 * Creates a YAML key sorter function based on a defined key order.
 * Keys in the order array are sorted first, in the specified order.
 * Keys not in the array are sorted after, maintaining their relative order.
 */
export function createYamlKeysSorter(keyOrder: string[]) {
  return (a: Pair, b: Pair): number => {
    if (!isScalar(a.key) || !isScalar(b.key)) {
      return 0;
    }
    const keyA = a.key.value;
    const keyB = b.key.value;
    if (typeof keyA !== 'string' || typeof keyB !== 'string') {
      return 0;
    }
    const indexA = keyOrder.indexOf(keyA);
    const indexB = keyOrder.indexOf(keyB);
    if (indexA >= 0 && indexB < 0) {
      return -1;
    }

    if (indexA < 0 && indexB >= 0) {
      return 1;
    }

    return indexA - indexB;
  };
}

/**
 * Converts data to YAML string using the yaml package Document API.
 * This is the standard toYaml implementation used across Fleet.
 */
export function toYaml(data: any, options: any): string {
  const doc = new Document(data, options);
  return doc.toString();
}
