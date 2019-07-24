/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

import { IndexPatternPrivateState, IndexPatternColumn } from './indexpattern';
import {
  buildColumnForOperationType,
  operationDefinitionMap,
  OperationDefinition,
} from './operations';

function getExpressionForLayer(
  indexPatternId: string,
  layerId: string,
  columns: Record<string, IndexPatternColumn>,
  columnOrder: string[]
) {
  if (columnOrder.length === 0) {
    return null;
  }

  function getEsAggsConfig<C extends IndexPatternColumn>(column: C, columnId: string) {
    // Typescript is not smart enough to infer that definitionMap[C['operationType']] is always OperationDefinition<C>,
    // but this is made sure by the typing of the operation map
    const operationDefinition = (operationDefinitionMap[
      column.operationType
    ] as unknown) as OperationDefinition<C>;
    return operationDefinition.toEsAggsConfig(column, columnId);
  }

  const columnEntries = columnOrder.map(
    colId => [colId, columns[colId]] as [string, IndexPatternColumn]
  );

  if (columnEntries.length) {
    const aggs = columnEntries.map(([colId, col]) => {
      return getEsAggsConfig(col, colId);
    });

    const idMap = columnEntries.reduce(
      (currentIdMap, [colId], index) => {
        return {
          ...currentIdMap,
          [`col-${index}-${colId}`]: colId,
        };
      },
      {} as Record<string, string>
    );

    const filterRatios = columnEntries.filter(
      ([colId, col]) => col.operationType === 'filter_ratio'
    );

    if (filterRatios.length) {
      const countColumn = buildColumnForOperationType({
        index: columnEntries.length,
        op: 'count',
        columns,
        suggestedPriority: 2,
        layerId,
        indexPatternId,
      });
      aggs.push(getEsAggsConfig(countColumn, 'filter-ratio'));

      return `esaggs
        index="${indexPatternId}"
        metricsAtAllLevels=false
        partialRows=false
        aggConfigs='${JSON.stringify(aggs)}' | lens_rename_columns idMap='${JSON.stringify(
        idMap
      )}' | ${filterRatios.map(([id]) => `lens_calculate_filter_ratio id=${id}`).join(' | ')}`;
    }

    return `esaggs
      index="${indexPatternId}"
      metricsAtAllLevels=false
      partialRows=false
      aggConfigs='${JSON.stringify(aggs)}' | lens_rename_columns idMap='${JSON.stringify(idMap)}'`;
  }

  return null;
}

export function toExpression(state: IndexPatternPrivateState, layerId: string) {
  if (state.layers[layerId]) {
    return getExpressionForLayer(
      state.layers[layerId].indexPatternId,
      layerId,
      state.layers[layerId].columns,
      state.layers[layerId].columnOrder
    );
  }

  return null;
}
