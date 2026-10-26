/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatatableColumnType } from '@kbn/expressions-plugin/common';
import type { GenericIndexPatternColumn, StructuredDatasourceStates } from '@kbn/lens-common';

export interface ColumnMeta {
  fieldType?: string | 'multi_terms' | 'range';
  dataType?: GenericIndexPatternColumn['dataType'] | DatatableColumnType;
}

export function getColumnMetaFn(
  datasourceStates?: StructuredDatasourceStates
): ((layerId: string, columnIds: string[]) => ColumnMeta) | null {
  if (datasourceStates?.formBased?.layers) {
    const layers = datasourceStates.formBased.layers;
    return (layerId, columnIds) => {
      // In formBased layers there is only one possible column associated with a split accessor
      // we can pick the first
      const columnId = columnIds.at(0);
      const column = columnId ? layers[layerId]?.columns?.[columnId] : undefined;
      return {
        fieldType:
          column && 'params' in column
            ? (column.params as { parentFormat?: { id?: string } })?.parentFormat?.id
            : undefined,
        dataType: column?.dataType,
      };
    };
  }

  if (datasourceStates?.textBased?.layers) {
    const layers = datasourceStates.textBased.layers;
    return (layerId, columnIds) => {
      const column = layers[layerId]?.columns?.find((c) => c.columnId === columnIds.at(0));
      // if we are using multiple split accessor we need to specify that all the columns are part of the same split, thus a multi-terms
      // there is no need to specify the dataType in this case.
      return columnIds.length > 1 ? { fieldType: 'multi-terms' } : { dataType: column?.meta?.type };
    };
  }

  return null;
}
