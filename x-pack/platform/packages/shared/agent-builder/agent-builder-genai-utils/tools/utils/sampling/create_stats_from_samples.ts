/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { orderBy, omit } from 'lodash';
import type { SampleDoc } from './get_sample_docs';

export interface SamplingStats {
  /** number of sample documents which were used for those stats */
  sampleCount: number;
  /** per-field stats based on the samples */
  fieldStats: Record<string, FieldStats>;
}

export interface FieldStats {
  /** number of sampling documents having at least one value */
  filledDocCount: number;
  /** number of sampling documents not having any value */
  emptyDocCount: number;
  /** values with count, sorted by count desc */
  values: FieldValueWithCount[];
}

export interface FieldValueWithCount {
  value: number | string | boolean;
  count: number;
}

export const createStatsFromSamples = ({ samples }: { samples: SampleDoc[] }): SamplingStats => {
  const stats = new Map<
    string,
    {
      filled: number;
      values: Map<string | number | boolean, number>;
    }
  >();

  samples.forEach((sample) => {
    Object.entries(sample.values).forEach(([fieldName, fieldValues]) => {
      if (!stats.has(fieldName)) {
        stats.set(fieldName, { filled: 0, values: new Map() });
      }
      const fieldStats = stats.get(fieldName)!;
      fieldStats.filled++;

      for (const fieldValue of fieldValues) {
        fieldStats.values.set(fieldValue, (fieldStats.values.get(fieldValue) ?? 0) + 1);
      }
    });
  });

  const fullStats = [...stats.entries()].map<FieldStats & { fieldPath: string }>(
    ([fieldPath, fieldValues]) => {
      return {
        fieldPath,
        filledDocCount: fieldValues.filled,
        emptyDocCount: samples.length - fieldValues.filled,
        values: orderBy(
          [...fieldValues.values.entries()].map(([value, count]) => ({ value, count })),
          ['count'],
          ['desc']
        ),
      };
    }
  );

  return {
    sampleCount: samples.length,
    fieldStats: fullStats.reduce((record, entry) => {
      record[entry.fieldPath] = omit(entry, ['fieldPath']);
      return record;
    }, {} as Record<string, FieldStats>),
  };
};
