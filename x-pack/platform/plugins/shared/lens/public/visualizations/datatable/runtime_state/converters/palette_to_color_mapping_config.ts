/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreTheme } from '@kbn/core/public';
import { CustomPaletteParams } from '@kbn/coloring';

import { paletteToColorMapping } from '../../../../runtime_state/converters/palette_to_color_mapping';
import { DatatableVisualizationState } from '../../visualization';
import { ColumnState } from '../../../../../common/expressions';
import { GeneralDatasourceStates } from '../../../../state_management';
import { getColumnMetaFn } from '../../../../runtime_state';

export const convertPaletteToColorMappingConfigFn = (
  theme: CoreTheme,
  datasourceStates?: Readonly<GeneralDatasourceStates>
) => {
  const getColumnMeta = getColumnMetaFn(datasourceStates);

  return (state: DatatableVisualizationState): DatatableVisualizationState => {
    const convertedColumns = state.columns.map((column) => {
      const columnMeta = getColumnMeta?.(state.layerId, column.columnId);

      // only convert color by terms palette
      if (column.palette && columnMeta?.isBucketed) {
        return {
          ...column,
          palette: undefined,
          colorMapping: paletteToColorMapping<CustomPaletteParams>(
            theme,
            column.palette,
            column.colorMapping
          ),
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
