/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ColumnState } from '../../../../../common/expressions';
import {
  DeprecatedColorMappingConfig,
  convertToRawColorMappings,
  getColumnMetaFn,
  isDeprecatedColorMapping,
} from '../../../../runtime_state/converters/raw_color_mappings';
import { GeneralDatasourceStates } from '../../../../state_management';
import { DatatableVisualizationState } from '../../visualization';

/** @deprecated */
interface DeprecatedColorMappingColumn extends Omit<ColumnState, 'colorMapping'> {
  colorMapping: DeprecatedColorMappingConfig;
}

/**
 * Old color mapping state meant for type safety during runtime migrations of old configurations
 *
 * @deprecated Use respective vis state (i.e. `DatatableVisualizationState`)
 */
export interface DeprecatedColorMappingsState extends Omit<DatatableVisualizationState, 'columns'> {
  columns: Array<DeprecatedColorMappingColumn | ColumnState>;
}

export const convertToRawColorMappingsFn = (
  datasourceStates?: Readonly<GeneralDatasourceStates>
) => {
  const getColumnMeta = getColumnMetaFn(datasourceStates);

  return (
    state: DeprecatedColorMappingsState | DatatableVisualizationState
  ): DatatableVisualizationState => {
    const hasDeprecatedColorMappings = state.columns.some((column) => {
      return isDeprecatedColorMapping(column.colorMapping);
    });

    if (!hasDeprecatedColorMappings) return state as DatatableVisualizationState;

    const convertedColumns = state.columns.map((column) => {
      if (column.colorMapping?.assignments || column.colorMapping?.specialAssignments) {
        const columnMeta = getColumnMeta?.(state.layerId, column.columnId);

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
};
