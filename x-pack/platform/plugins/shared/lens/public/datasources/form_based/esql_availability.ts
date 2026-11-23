/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partition } from 'lodash';
import type {
  ColumnRoles,
  DateRange,
  EsqlConversionFailureReason,
  EsqlQueryResult,
  FormBasedLayer,
  IndexPattern,
  IndexPatternMap,
} from '@kbn/lens-common';
import { generateEsqlQuery } from '@kbn/lens-common';
import type { IUiSettingsClient } from '@kbn/core/public';
import { operationDefinitionMap } from './operations';

export type FormBasedEsqlAvailability =
  | { isAvailable: true }
  | { isAvailable: false; reason: EsqlConversionFailureReason };

/**
 * Generates the ES|QL query for one form-based layer.
 * Unexpected generator errors are reported as an `unknown` failure so callers handle one result shape.
 */
export const getLayerEsqlQuery = ({
  layer,
  indexPattern,
  uiSettings,
  dateRange,
  nowInstant,
  columnRoles,
}: {
  layer: FormBasedLayer;
  indexPattern: IndexPattern;
  uiSettings: IUiSettingsClient;
  dateRange: DateRange;
  nowInstant: Date;
  columnRoles?: ColumnRoles;
}): EsqlQueryResult => {
  const columnEntries = layer.columnOrder.map((colId) => [colId, layer.columns[colId]] as const);
  const [, esAggEntries] = partition(
    columnEntries,
    ([, col]) =>
      (operationDefinitionMap[col.operationType]?.input === 'fullReference' ||
        operationDefinitionMap[col.operationType]?.input === 'managedReference') &&
      col.operationType !== 'static_value'
  );

  try {
    return generateEsqlQuery(
      esAggEntries,
      layer,
      indexPattern,
      uiSettings,
      dateRange,
      nowInstant,
      columnRoles
    );
  } catch (e) {
    return { success: false, reason: 'unknown' };
  }
};

/**
 * Reports whether every given layer can be fetched with ES|QL, or the first reason it cannot.
 * Empty layers and layers without a loaded data view are skipped, as they produce no query.
 */
export const getFormBasedEsqlAvailability = ({
  layers,
  layerIds,
  indexPatterns,
  uiSettings,
  dateRange,
  nowInstant,
}: {
  layers: Record<string, FormBasedLayer>;
  layerIds: string[];
  indexPatterns: IndexPatternMap;
  uiSettings: IUiSettingsClient;
  dateRange: DateRange;
  nowInstant: Date;
}): FormBasedEsqlAvailability => {
  for (const layerId of layerIds) {
    const layer = layers[layerId];
    if (!layer) {
      return { isAvailable: false, reason: 'unknown' };
    }

    const indexPattern = indexPatterns[layer.indexPatternId];
    if (layer.columnOrder.length === 0 || !indexPattern) {
      continue;
    }

    const esqlQuery = getLayerEsqlQuery({
      layer,
      indexPattern,
      uiSettings,
      dateRange,
      nowInstant,
    });
    if (!esqlQuery.success) {
      return { isAvailable: false, reason: esqlQuery.reason };
    }
  }

  return { isAvailable: true };
};
