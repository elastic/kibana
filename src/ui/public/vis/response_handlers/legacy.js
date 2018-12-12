/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';
import AggConfigResult from '../../vis/agg_config_result';
import { VisResponseHandlersRegistryProvider } from '../../registry/vis_response_handlers';

const LegacyResponseHandlerProvider = function () {

  return {
    name: 'legacy',
    handler: function (table) {
      return new Promise((resolve) => {
        const converted = { tables: [] };

        // check if there are buckets after the first metric
        const metricsAtAllLevels = table.columns.findIndex(column => _.get(column, 'aggConfig.type.type') === 'metrics') <
          _.findLastIndex(table.columns, column => _.get(column, 'aggConfig.type.type') === 'buckets');

        const splitColumn = table.columns.find(column => _.get(column, 'aggConfig.schema.name') === 'split');
        const numberOfMetrics = table.columns.filter(column => _.get(column, 'aggConfig.type.type') === 'metrics').length;
        const numberOfBuckets = table.columns.filter(column => _.get(column, 'aggConfig.type.type') === 'buckets').length;
        const metricsPerBucket = numberOfMetrics / numberOfBuckets;

        if (splitColumn) {
          const splitAgg = splitColumn.aggConfig;
          const splitMap = {};
          let splitIndex = 0;

          table.rows.forEach((row, rowIndex) => {
            const splitValue = row[splitColumn.id];
            const splitColumnIndex = table.columns.findIndex(column => column === splitColumn);

            if (!splitMap.hasOwnProperty(splitValue)) {
              splitMap[splitValue] = splitIndex++;
              const tableGroup = {
                $parent: converted,
                aggConfig: splitAgg,
                title: `${splitValue}: ${splitAgg.makeLabel()}`,
                key: splitValue,
                tables: []
              };
              tableGroup.tables.push({
                $parent: tableGroup,
                columns: table.columns.filter((column, i) => {
                  const isSplitColumn = i === splitColumnIndex;
                  const isSplitMetric = metricsAtAllLevels && i > splitColumnIndex && i <= splitColumnIndex + metricsPerBucket;
                  return !isSplitColumn && !isSplitMetric;
                }).map(column => ({ title: column.name, ...column })),
                rows: []
              });

              converted.tables.push(tableGroup);
            }

            let previousSplitAgg = new AggConfigResult(splitAgg, null, splitValue, splitValue);
            previousSplitAgg.rawData = {
              table: table,
              column: splitColumnIndex,
              row: rowIndex,
            };
            const tableIndex = splitMap[splitValue];
            const newRow = _.map(converted.tables[tableIndex].tables[0].columns, column => {
              const value = row[column.id];
              const aggConfigResult = new AggConfigResult(column.aggConfig, previousSplitAgg, value, value);
              aggConfigResult.rawData = {
                table: table,
                column: table.columns.findIndex(c => c.id === column.id),
                row: rowIndex,
              };
              if (column.aggConfig.type.type === 'buckets') {
                previousSplitAgg = aggConfigResult;
              }
              return aggConfigResult;
            });

            converted.tables[tableIndex].tables[0].rows.push(newRow);
          });
        } else {

          converted.tables.push({
            columns: table.columns.map(column => ({ title: column.name, ...column })),
            rows: table.rows.map((row, rowIndex) => {
              let previousSplitAgg;
              return table.columns.map((column, columnIndex) => {
                const value = row[column.id];
                const aggConfigResult = new AggConfigResult(column.aggConfig, previousSplitAgg, value, value);
                aggConfigResult.rawData = {
                  table: table,
                  column: columnIndex,
                  row: rowIndex,
                };
                if (column.aggConfig.type.type === 'buckets') {
                  previousSplitAgg = aggConfigResult;
                }
                return aggConfigResult;
              });
            }),
            aggConfig: (column) => column.aggConfig
          });
        }

        resolve(converted);
      });
    }
  };
};

VisResponseHandlersRegistryProvider.register(LegacyResponseHandlerProvider);

export { LegacyResponseHandlerProvider };
