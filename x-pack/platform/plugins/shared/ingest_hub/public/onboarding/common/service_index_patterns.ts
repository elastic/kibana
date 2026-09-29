/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValidDataStreamIndexPattern } from '@kbn/fleet-plugin/common';
import type { AwsServiceMatrixEntry } from '../aws_service_matrix';

/**
 * Returns the index patterns for a service entry.
 * Each data stream with a known dataset produces a pattern of the form
 * `<type>-<dataset>-<namespace>`. The namespace falls back to `*` when none is given or when the
 * has_data route would reject the resulting pattern.
 * Falls back to `logs-<packageName>.*-*` when the manifest doesn't expose the dataset field.
 */
export function getServiceIndexPatterns(
  entry: AwsServiceMatrixEntry,
  namespace?: string
): string[] {
  const patterns: string[] = [];
  if (entry.varDefsByDataStream) {
    for (const [, dsInfo] of Object.entries(entry.varDefsByDataStream)) {
      if (dsInfo.dataset && dsInfo.type) {
        const concrete = `${dsInfo.type}-${dsInfo.dataset}-${namespace}`;
        patterns.push(
          namespace && isValidDataStreamIndexPattern(concrete)
            ? concrete
            : `${dsInfo.type}-${dsInfo.dataset}-*`
        );
      }
    }
  }

  if (patterns.length === 0) {
    patterns.push(`logs-${entry.packageName}.*-*`);
  }

  return [...new Set(patterns)];
}
