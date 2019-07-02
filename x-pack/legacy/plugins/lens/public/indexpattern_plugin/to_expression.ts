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

export function toExpression(state: IndexPatternPrivateState) {
  if (state.columnOrder.length === 0) {
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

  const columnEntries = state.columnOrder.map(
    colId => [colId, state.columns[colId]] as [string, IndexPatternColumn]
  );

  if (columnEntries.length) {
    const aggs = columnEntries.map(([colId, col]) => {
      return getEsAggsConfig(col, colId);
    });

    // TODO: The filters will generate extra columns which are actually going to affect the aggregation order. They need
    // to be added right before all the metrics, and then removed

    const idMap = columnEntries.reduce(
      (currentIdMap, [colId], index) => {
        return {
          ...currentIdMap,
          [`col-${index}-${colId}`]: colId,
        };
      },
      {} as Record<string, string>
    );

    const expression = `esaggs
      index="${state.currentIndexPatternId}"
      metricsAtAllLevels=false
      partialRows=false
      aggConfigs='${JSON.stringify(aggs)}' | lens_rename_columns idMap='${JSON.stringify(
      idMap
    )}' | clog`;

    const filterRatios = columnEntries.filter(
      ([colId, col]) => col.operationType === 'filter_ratio'
    );

    if (filterRatios.length) {
      const countColumn = buildColumnForOperationType(columnEntries.length, 'count', 2);
      aggs.push(getEsAggsConfig(countColumn, 'filter-ratio'));

      return `esaggs
        index="${state.currentIndexPatternId}"
        metricsAtAllLevels=false
        partialRows=false
        aggConfigs='${JSON.stringify(aggs)}' | lens_rename_columns idMap='${JSON.stringify(
        idMap
      )}' | ${filterRatios
        .map(([id]) => `lens_calculate_filter_ratio id=${id}`)
        .join(' | ')} | clog`;
    }

    return expression;
  }

  return null;
}
