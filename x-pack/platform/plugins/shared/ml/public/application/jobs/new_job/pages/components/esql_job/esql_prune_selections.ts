/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLFieldWithMetadata } from '@kbn/esql-types';
import type { EsqlDetectorConfig } from '../../../common/job_creator/esql_job_creator';

export interface EsqlPrunableSelections {
  emittedTimeField: string;
  detectors: EsqlDetectorConfig[];
  influencers: string[];
  summaryCountFieldName: string;
}

/**
 * When the query changes and its output columns are re-resolved, drop
 * downstream selections that reference a column no longer produced by the
 * query, rather than wiping the whole PICK_FIELDS step (LEAD DECISION
 * 2026-09-29, g2sz.10: "editing query re-resolves columns and prunes
 * downstream selections that no longer exist").
 *
 * A detector is dropped entirely (not just its field) when its *primary*
 * field_name is gone, since a metric detector with no field_name left is
 * meaningless; by/over/partition fields are pruned individually so a
 * detector survives losing just one of them.
 */
export const pruneEsqlSelections = (
  selections: EsqlPrunableSelections,
  nextColumns: ESQLFieldWithMetadata[]
): EsqlPrunableSelections => {
  const validColumnNames = new Set(nextColumns.map(({ name }) => name));
  const emittedTimeField = validColumnNames.has(selections.emittedTimeField)
    ? selections.emittedTimeField
    : '';

  const detectors = selections.detectors
    .filter((detector) => detector.field === undefined || validColumnNames.has(detector.field))
    .map((detector) => {
      const next: EsqlDetectorConfig = { ...detector };

      (['byField', 'overField', 'partitionField'] as const).forEach((key) => {
        const value = next[key];
        if (value !== undefined && !validColumnNames.has(value)) {
          delete next[key];
        }
      });

      return next;
    });

  const influencers = selections.influencers.filter((name) => validColumnNames.has(name));

  const summaryCountFieldName = validColumnNames.has(selections.summaryCountFieldName)
    ? selections.summaryCountFieldName
    : '';

  return { emittedTimeField, detectors, influencers, summaryCountFieldName };
};
