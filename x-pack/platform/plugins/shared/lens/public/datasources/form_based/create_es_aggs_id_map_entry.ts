/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core/public';
import type {
  DateRange,
  FormBasedLayer,
  IndexPattern,
  ValueFormatConfig,
  GenericIndexPatternColumn,
} from '@kbn/lens-common';
import type { OriginalColumn } from '../../../common/types';
import { operationDefinitionMap } from './operations';

export interface CreateEsAggsIdMapEntryParams {
  col: GenericIndexPatternColumn;
  colId: string;
  layer: FormBasedLayer;
  indexPattern: IndexPattern;
  uiSettings: IUiSettingsClient;
  dateRange: DateRange;
  /** Format configuration for the column (accepts ValueFormatConfig or serialized format) */
  format?: ValueFormatConfig | Record<string, unknown>;
  /** Interval for date histogram buckets (in ms) */
  interval?: number;
  /** Whether to include sourceField in the output (for bucket columns) */
  includeSourceField?: boolean;
}

/**
 * Creates an entry for the esAggsIdMap with consistent structure.
 * Used for metrics, buckets, and static values in ES|QL conversion.
 */
export function createEsAggsIdMapEntry({
  col,
  colId,
  layer,
  indexPattern,
  format,
  interval,
  uiSettings,
  dateRange,
  includeSourceField = false,
}: CreateEsAggsIdMapEntryParams): OriginalColumn[] {
  const label = col.customLabel
    ? col.label
    : operationDefinitionMap[col.operationType].getDefaultLabel(
        col,
        layer.columns,
        indexPattern,
        uiSettings,
        dateRange
      );

  // Build the entry with proper typing for the discriminated union
  if (col.operationType === 'date_histogram' && 'sourceField' in col && interval !== undefined) {
    return [
      {
        id: colId,
        label,
        operationType: 'date_histogram',
        sourceField: col.sourceField!,
        interval,
        ...(format !== undefined ? { format } : {}),
        ...(col.dataType ? { dataType: col.dataType } : {}),
        ...(col.customLabel ? { customLabel: col.customLabel } : {}),
      },
    ];
  }

  // Non-date_histogram columns
  return [
    {
      id: colId,
      label,
      operationType: col.operationType,
      interval: undefined as never,
      ...(includeSourceField && 'sourceField' in col ? { sourceField: col.sourceField } : {}),
      ...(format !== undefined ? { format } : {}),
      ...(col.dataType ? { dataType: col.dataType } : {}),
      ...(col.customLabel ? { customLabel: col.customLabel } : {}),
    },
  ];
}
