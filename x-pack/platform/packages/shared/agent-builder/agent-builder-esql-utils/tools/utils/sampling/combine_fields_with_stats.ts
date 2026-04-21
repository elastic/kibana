/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingField } from '../mappings';
import type { SamplingStats, FieldStats } from './create_stats_from_samples';

export type MappingFieldWithStats = MappingField & {
  stats: FieldStats;
};

export const combineFieldsWithStats = ({
  fields,
  stats,
}: {
  fields: MappingField[];
  stats: SamplingStats;
}): MappingFieldWithStats[] => {
  return fields.map<MappingFieldWithStats>((field) => {
    const fieldStats = stats.fieldStats[field.path] ?? {
      filledDocCount: 0,
      emptyDocCount: stats.sampleCount,
      values: [],
    };

    return {
      ...field,
      stats: fieldStats,
    };
  });
};
