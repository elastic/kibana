/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { IndexPatternColumn } from './indexpattern';
import { buildColumn, operationDefinitionMap } from './operations';
import { IndexPattern, IndexPatternPrivateState } from './types';
import { OriginalColumn } from './rename_columns';

function getExpressionForLayer(
  indexPattern: IndexPattern,
  layerId: string,
  columns: Record<string, IndexPatternColumn>,
  columnOrder: string[]
) {
  if (columnOrder.length === 0) {
    return null;
  }

  function getEsAggsConfig<C extends IndexPatternColumn>(column: C, columnId: string) {
    return operationDefinitionMap[column.operationType].toEsAggsConfig(column, columnId);
  }

  const columnEntries = columnOrder.map(colId => [colId, columns[colId]] as const);

  if (columnEntries.length) {
    const aggs = columnEntries.map(([colId, col]) => {
      return getEsAggsConfig(col, colId);
    });

    const idMap = columnEntries.reduce(
      (currentIdMap, [colId], index) => {
        return {
          ...currentIdMap,
          [`col-${index}-${colId}`]: {
            ...columns[colId],
            id: colId,
          },
        };
      },
      {} as Record<string, OriginalColumn>
    );

    const filterRatios = columnEntries.filter(
      ([colId, col]) => col.operationType === 'filter_ratio'
    );

    const expression = `esaggs
      index="${indexPattern.id}"
      metricsAtAllLevels=false
      partialRows=false
      includeFormatHints=true
      aggConfigs={lens_auto_date aggConfigs='${JSON.stringify(
        aggs
      )}'} | lens_rename_columns idMap='${JSON.stringify(idMap)}'`;

    if (!filterRatios.length) {
      return expression;
    }

    const countColumn = buildColumn({
      op: 'count',
      columns,
      suggestedPriority: 2,
      layerId,
      indexPattern,
    });
    aggs.push(getEsAggsConfig(countColumn, 'filter-ratio'));

    return `${expression} | ${filterRatios
      .map(([id]) => `lens_calculate_filter_ratio id=${id}`)
      .join(' | ')}`;
  }

  return null;
}

export function toExpression(state: IndexPatternPrivateState, layerId: string) {
  if (state.layers[layerId]) {
    return getExpressionForLayer(
      state.indexPatterns[state.layers[layerId].indexPatternId],
      layerId,
      state.layers[layerId].columns,
      state.layers[layerId].columnOrder
    );
  }

  return null;
}
