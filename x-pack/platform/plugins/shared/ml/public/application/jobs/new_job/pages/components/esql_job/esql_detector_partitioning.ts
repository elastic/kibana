/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLFieldWithMetadata } from '@kbn/esql-types';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { NUMERIC_ESQL_TYPES } from './esql_numeric_types';
import { requiresByField } from './esql_detector_functions';
import type { EsqlDetectorConfig } from '../../../common/job_creator/esql_job_creator';

/**
 * ES|QL output columns eligible as by/over/partition field for a detector:
 * non-numeric (per LEAD DECISION, g2sz.10) and not the query's emitted time
 * column (partitioning on the bucketing time column is meaningless).
 */
export const byOverPartitionColumns = (
  columns: ESQLFieldWithMetadata[],
  emittedTimeField: string
): ESQLFieldWithMetadata[] =>
  columns.filter(({ name, type }) => name !== emittedTimeField && !NUMERIC_ESQL_TYPES.has(type));

export const byOverPartitionOptions = (
  columns: ESQLFieldWithMetadata[],
  emittedTimeField: string
): EuiComboBoxOptionOption[] =>
  byOverPartitionColumns(columns, emittedTimeField).map(({ name, type }) => ({
    label: name,
    append: type,
  }));

export type EsqlPartitioningFieldKey = 'byField' | 'overField' | 'partitionField';

export type EsqlPartitioningError =
  | 'byFieldRequiredForFunction'
  | 'duplicateField'
  | 'unknownField'
  | 'timeColumnUsed';

/**
 * Client-side-only validation for a single detector's by/over/partition
 * selections (LEAD DECISION, g2sz.10): each selected column must exist,
 * must not be the emitted time column, and no column may be reused across
 * by/over/partition within the same detector. `rare`/`freq_rare` additionally
 * require `byField`. Server-side PUT validation remains authoritative.
 */
export const validateDetectorPartitioning = (
  detector: EsqlDetectorConfig,
  columns: ESQLFieldWithMetadata[],
  emittedTimeField: string
): Partial<Record<EsqlPartitioningFieldKey, EsqlPartitioningError>> => {
  const errors: Partial<Record<EsqlPartitioningFieldKey, EsqlPartitioningError>> = {};
  const validColumnNames = new Set(
    byOverPartitionColumns(columns, emittedTimeField).map((c) => c.name)
  );

  const fields: Array<[EsqlPartitioningFieldKey, string | undefined]> = [
    ['byField', detector.byField],
    ['overField', detector.overField],
    ['partitionField', detector.partitionField],
  ];

  const seen = new Map<string, EsqlPartitioningFieldKey>();

  for (const [key, value] of fields) {
    if (value === undefined || value === '') continue;

    if (value === emittedTimeField) {
      errors[key] = 'timeColumnUsed';
      continue;
    }

    if (!validColumnNames.has(value)) {
      errors[key] = 'unknownField';
      continue;
    }

    if (seen.has(value)) {
      errors[key] = 'duplicateField';
      errors[seen.get(value)!] = 'duplicateField';
    } else {
      seen.set(value, key);
    }
  }

  if (requiresByField(detector.function) && !detector.byField) {
    errors.byField = errors.byField ?? 'byFieldRequiredForFunction';
  }

  return errors;
};

export const isDetectorPartitioningValid = (
  detector: EsqlDetectorConfig,
  columns: ESQLFieldWithMetadata[],
  emittedTimeField: string
): boolean =>
  Object.keys(validateDetectorPartitioning(detector, columns, emittedTimeField)).length === 0;
