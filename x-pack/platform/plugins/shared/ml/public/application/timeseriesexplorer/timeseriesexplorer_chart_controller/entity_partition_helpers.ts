/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CriteriaField } from '../../services/results_service';

/**
 * Criteria fields for ML results APIs (e.g. getAnomaliesTableData).
 * Mirrors legacy logic from TimeSeriesExplorer#getCriteriaFields.
 */
export function buildCriteriaFields(
  detectorIndex: number,
  entities: Array<{ fieldName: string; fieldValue: unknown | null }>
): CriteriaField[] {
  const nonBlankEntities = entities.filter((entity) => entity.fieldValue !== null);
  return [{ fieldName: 'detector_index', fieldValue: detectorIndex }, ...nonBlankEntities];
}
