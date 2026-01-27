/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GeneralDatasourceStates } from '@kbn/lens-common';
import type { DatatableVisualizationState } from '../../../../../public';
import type { ColumnState } from '../../../../expressions';
import {
  convertToRawColorMappings,
  getColumnMetaFn,
  isDeprecatedColorMapping,
  type DeprecatedColorMappingConfig,
} from './common';

/** @deprecated */
interface DeprecatedColorMappingColumn extends Omit<ColumnState, 'colorMapping'> {
  colorMapping: DeprecatedColorMappingConfig;
}

/**
 * Old color mapping state meant for type safety during runtime migrations of old configurations
 *
 * @deprecated Use respective vis state (i.e. `DatatableVisualizationState`)
 */
export interface DeprecatedColorMappingsDatatableState
  extends Omit<DatatableVisualizationState, 'columns'> {
  columns: Array<ColumnState | DeprecatedColorMappingColumn>;
}

export const convertDatatableToRawColorMappings = (
  state: DatatableVisualizationState | DeprecatedColorMappingsDatatableState,
  datasourceStates?: Readonly<GeneralDatasourceStates>
): DatatableVisualizationState => {
  const getColumnMeta = getColumnMetaFn(datasourceStates);
  const hasDeprecatedColorMappings = state.columns.some((column) => {
    return isDeprecatedColorMapping(column.colorMapping);
  });

  if (!hasDeprecatedColorMappings) return state as DatatableVisualizationState;

  const convertedColumns = state.columns.map((column) => {
    if (column.colorMapping?.assignments || column.colorMapping?.specialAssignments) {
      const columnMeta = getColumnMeta?.(state.layerId, [column.columnId]);

      return {
        ...column,
        colorMapping: convertToRawColorMappings(column.colorMapping, columnMeta),
      } satisfies ColumnState;
    }

    return column as ColumnState;
  });

  return {
    ...state,
    columns: convertedColumns,
  } satisfies DatatableVisualizationState;
};
