/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwsServiceMatrixEntry } from '../aws_service_matrix';

/**
 * Returns the index patterns for a service entry.
 * Each data stream with a known dataset produces a pattern of the form
 * `<type>-<dataset>-*`. Falls back to `logs-<packageName>.*-*` when the
 * manifest doesn't expose the dataset field.
 */
export function getServiceIndexPatterns(entry: AwsServiceMatrixEntry): string[] {
  const patterns: string[] = [];

  if (entry.varDefsByDataStream) {
    for (const [, dsInfo] of Object.entries(entry.varDefsByDataStream)) {
      if (dsInfo.dataset && dsInfo.type) {
        patterns.push(`${dsInfo.type}-${dsInfo.dataset}-*`);
      }
    }
  }

  if (patterns.length === 0) {
    patterns.push(`logs-${entry.packageName}.*-*`);
  }

  return [...new Set(patterns)];
}
