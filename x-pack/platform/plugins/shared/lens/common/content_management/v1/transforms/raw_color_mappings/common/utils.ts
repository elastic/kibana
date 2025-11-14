/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatatableColumnType } from '@kbn/expressions-plugin/common';
import type { StructuredDatasourceStates } from '@kbn/lens-common';
import type { GenericIndexPatternColumn } from '../../../../../../public';

export interface ColumnMeta {
  fieldType?: string | 'multi_terms' | 'range';
  dataType?: GenericIndexPatternColumn['dataType'] | DatatableColumnType;
}

export function getColumnMetaFn(
  datasourceStates?: StructuredDatasourceStates
): ((layerId: string, columnId: string) => ColumnMeta) | null {
  if (datasourceStates?.formBased?.layers) {
    const layers = datasourceStates.formBased.layers;

    return (layerId, columnId) => {
      const column = layers[layerId]?.columns?.[columnId];
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

    return (layerId, columnId) => {
      const column = layers[layerId]?.columns?.find((c) => c.columnId === columnId);

      return {
        dataType: column?.meta?.type,
      };
    };
  }

  return null;
}
