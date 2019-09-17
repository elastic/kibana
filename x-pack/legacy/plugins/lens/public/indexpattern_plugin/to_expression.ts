/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { IndexPatternPrivateState, IndexPatternColumn } from './indexpattern';
import { buildColumn, operationDefinitionMap } from './operations';
import { IndexPattern } from '../../common';

function getExpressionForLayer(
  layerId: string,
  columns: Record<string, IndexPatternColumn>,
  columnOrder: string[],
  indexPattern: IndexPattern
) {
  if (!indexPattern || columnOrder.length === 0) {
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
          [`col-${index}-${colId}`]: colId,
        };
      },
      {} as Record<string, string>
    );

    const filterRatios = columnEntries.filter(
      ([colId, col]) => col.operationType === 'filter_ratio'
    );

    if (filterRatios.length) {
      const countColumn = buildColumn({
        op: 'count',
        columns,
        suggestedPriority: 2,
        layerId,
        indexPattern,
      });
      aggs.push(getEsAggsConfig(countColumn, 'filter-ratio'));

      return `esaggs
        index="${indexPattern.id}"
        metricsAtAllLevels=false
        partialRows=false
        includeFormatHints=true
        aggConfigs='${JSON.stringify(aggs)}' | lens_rename_columns idMap='${JSON.stringify(
        idMap
      )}' | ${filterRatios.map(([id]) => `lens_calculate_filter_ratio id=${id}`).join(' | ')}`;
    }

    return `esaggs
      index="${indexPattern.id}"
      metricsAtAllLevels=false
      partialRows=false
      includeFormatHints=true
      aggConfigs='${JSON.stringify(aggs)}' | lens_rename_columns idMap='${JSON.stringify(idMap)}'`;
  }

  return null;
}

export function toExpression(state: IndexPatternPrivateState, layerId: string) {
  const layer = state.layers[layerId];
  const indexPattern = layer && state.indexPatternMap[layer.indexPatternId];
  if (layer && indexPattern) {
    return getExpressionForLayer(layerId, layer.columns, layer.columnOrder, indexPattern);
  }

  return null;
}
