/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ColumnState, DatatableVisualizationState } from '@kbn/lens-common';
import { convertToOtherBucketColorMappings } from '../../../../runtime_state/converters/other_bucket_color_mappings';

export const convertToOtherColorMappingFn = (
  state: DatatableVisualizationState
): DatatableVisualizationState => {
  const convertedColumns = state.columns.map((column) => {
    if (column.colorMapping) {
      return {
        ...column,
        colorMapping: convertToOtherBucketColorMappings(column.colorMapping),
      } satisfies ColumnState;
    }

    return column as ColumnState;
  });

  return {
    ...state,
    columns: convertedColumns,
  } satisfies DatatableVisualizationState;
};
