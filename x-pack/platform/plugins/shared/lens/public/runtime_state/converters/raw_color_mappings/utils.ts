/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DatatableColumnType } from '@kbn/expressions-plugin/common';
import { GenericIndexPatternColumn } from '../../../datasources/form_based/types';
import { getStructuredDatasourceStates } from '../../../react_embeddable/helper';
import { GeneralDatasourceStates } from '../../../state_management';

export interface ColumnMeta {
  fieldType?: string | 'multi_terms' | 'range';
  dataType?: GenericIndexPatternColumn['dataType'] | DatatableColumnType;
}

export function getColumnMetaFn(
  datasourceStates?: Readonly<GeneralDatasourceStates>
): ((layerId: string, columnId: string) => ColumnMeta) | null {
  const datasources = getStructuredDatasourceStates(datasourceStates);

  if (datasources.formBased?.layers) {
    const layers = datasources.formBased.layers;

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

  if (datasources.textBased?.layers) {
    const layers = datasources.textBased.layers;

    return (layerId, columnId) => {
      const column = layers[layerId]?.columns?.find((c) => c.columnId === columnId);

      return {
        dataType: column?.meta?.type,
      };
    };
  }

  return null;
}
