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

  function getIdMap(layer: Array<[string, IndexPatternColumn]>) {
    return layer.reduce(
      (currentIdMap, [colId], index) => {
        return {
          ...currentIdMap,
          [`col-${index}-${colId}`]: colId,
        };
      },
      {} as Record<string, string>
    );
  }

  function getExpr(
    aggs: unknown[],
    idMap: Record<string, string>,
    filterRatios?: Array<[string, IndexPatternColumn]>
  ) {
    let expr = `esaggs
    index="${state.currentIndexPatternId}"
    metricsAtAllLevels=false
    partialRows=false
    aggConfigs='${JSON.stringify(aggs)}' | lens_rename_columns idMap='${JSON.stringify(idMap)}'`;

    if (filterRatios) {
      expr += `${filterRatios.map(([id]) => `lens_calculate_filter_ratio id=${id}`).join(' | ')}`;
    }

    return expr;
  }

  const columnEntries = state.columnOrder.map(
    colId => [colId, state.columns[colId]] as [string, IndexPatternColumn]
  );

  if (columnEntries.length) {
    const joinLayer = columnEntries.find(([colId, col]) => col.layer === 'join');
    const numericLayers = columnEntries.filter(([colId, col]) => typeof col.layer === 'number');

    let dataFetchExpression;

    console.log(!!joinLayer, numericLayers.length);
    if (joinLayer && numericLayers.length > 1) {
      const groupedLayers = _.groupBy(numericLayers, ([colId, col]) => col.layer);

      const tableFetchExpressions = Object.values(groupedLayers)
        .map(layer => {
          const [buckets, metrics] = _.partition(layer, ([colId, col]) => col.isBucketed);

          return buckets.concat([joinLayer], metrics);
        })
        .map(layer => {
          const aggs = layer.map(([colId, col]) => {
            return getEsAggsConfig(col, colId);
          });

          const idMap = getIdMap(layer);

          // TODO: Duplicate logic here, need to refactor
          const filterRatios = layer.filter(([colId, col]) => col.operationType === 'filter_ratio');

          if (filterRatios.length) {
            const countColumn = buildColumnForOperationType(
              columnEntries.length,
              'count',
              layer[0][1].suggestedOrder,
              layer[0][1].layer
            );
            aggs.push(getEsAggsConfig(countColumn, 'filter-ratio'));

            // return `esaggs
            //   index="${state.currentIndexPatternId}"
            //   metricsAtAllLevels=false
            //   partialRows=false
            //   aggConfigs='${JSON.stringify(aggs)}' | lens_rename_columns idMap='${JSON.stringify(
            //   idMap
            // )}' | ${filterRatios
            //   .map(([id]) => `lens_calculate_filter_ratio id=${id}`)
            //   .join(' | ')}`;
            return getExpr(aggs, idMap, filterRatios);
          }

          // const idMap = getIdMap(layer);

          // return `esaggs
          // index="${state.currentIndexPatternId}"
          // metricsAtAllLevels=false
          // partialRows=false
          // aggConfigs='${JSON.stringify(aggs)}' | lens_rename_columns idMap='${JSON.stringify(
          //   idMap
          // )}'`;
          return getExpr(aggs, idMap);
        })
        .map(layer => `tables={${layer}}`);

      dataFetchExpression = `lens_merge_tables joins="${joinLayer[0]}" ${tableFetchExpressions.join(
        '\n'
      )} | clog `;
    } else {
      const aggs = columnEntries.map(([colId, col]) => {
        return getEsAggsConfig(col, colId);
      });

      const filterRatios = columnEntries.filter(
        ([colId, col]) => col.operationType === 'filter_ratio'
      );

      const idMap = getIdMap(columnEntries);
      if (filterRatios.length) {
        const countColumn = buildColumnForOperationType(columnEntries.length, 'count', 2, 0);
        aggs.push(getEsAggsConfig(countColumn, 'filter-ratio'));

        // const idMap = getIdMap(columnEntries);

        // return `esaggs
        //   index="${state.currentIndexPatternId}"
        //   metricsAtAllLevels=false
        //   partialRows=false
        //   aggConfigs='${JSON.stringify(aggs)}' | lens_rename_columns idMap='${JSON.stringify(
        //   idMap
        // )}' | ${filterRatios.map(([id]) => `lens_calculate_filter_ratio id=${id}`).join(' | ')}`;
        dataFetchExpression = getExpr(aggs, idMap, filterRatios);
      } else {
        dataFetchExpression = getExpr(aggs, idMap);
      }
    }

    // const idMap = getIdMap(columnEntries);

    // return dataFetchExpression + `| lens_rename_columns idMap='${JSON.stringify(idMap)}'`;
    console.log(dataFetchExpression);
    return dataFetchExpression;
  }

  return null;
}
