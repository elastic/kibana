/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CriteriaField } from '@kbn/ml-common-types/results';

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

export interface SmvEntityControl {
  fieldName: string;
  fieldValue: string | null;
}

/**
 * Shared table-filter handler for SMV page and embeddable chart.
 *
 * Applies an include (`+`) or exclude (`-`) filter from the anomalies table onto the
 * entity partition controls and forwards the merged result to `setEntities`.
 * No-ops when the field is not found, or when the operator would produce no change.
 */
export function applySmvTableFilter(
  field: string,
  value: string,
  operator: string,
  entityControls: SmvEntityControl[],
  setEntities: (entities: Record<string, string | null>) => void
): void {
  const entity = entityControls.find(({ fieldName }) => fieldName === field);
  if (entity === undefined) {
    return;
  }

  let resultValue: string | null = '';
  if (operator === '+' && entity.fieldValue !== value) {
    resultValue = value;
  } else if (operator === '-' && entity.fieldValue === value) {
    resultValue = null;
  } else {
    return;
  }

  const resultEntities: Record<string, string | null> = {
    ...entityControls.reduce<Record<string, string | null>>((acc, e) => {
      acc[e.fieldName] = e.fieldValue;
      return acc;
    }, {}),
    [entity.fieldName]: resultValue,
  };

  setEntities(resultEntities);
}
