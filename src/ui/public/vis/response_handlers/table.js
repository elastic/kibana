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
import { tabifyAggResponse } from '../../agg_response/tabify';
import AggConfigResult from '../../vis/agg_config_result';
import { VisResponseHandlersRegistryProvider } from '../../registry/vis_response_handlers';

const TableResponseHandlerProvider = function () {

  return {
    name: 'table',
    handler: function (vis, response) {
      return new Promise((resolve) => {
        const converted = { tables: [] };
        const table = tabifyAggResponse(vis.getAggConfig(), response);

        const splitColumn = table.columns.find(column => column.aggConfig.schema.name === 'split');
        if (splitColumn) {
          const splitAgg = splitColumn.aggConfig;
          const splitMap = {};
          let splitIndex = 0;

          table.rows.forEach(row => {
            const splitValue = row[splitColumn.id];
            const splitColumnIndex = table.columns.findIndex(column => column === splitColumn);

            if (!splitMap[splitValue]) {
              splitMap[splitValue] = splitIndex++;
              converted.tables.push({
                aggConfig: (column) => column.aggConfig,
                title: splitValue,
                columns: table.columns.filter((column, i) => i !== splitColumnIndex),
                rows: []
              });
            }

            let previousSplitAgg = new AggConfigResult(splitAgg, null, splitValue, splitValue);
            const tableIndex = splitMap[splitValue];
            const newRow = _.map(converted.tables[tableIndex].columns, column => {
              const value = row[column.id];
              const aggConfigResult = new AggConfigResult(column.aggConfig, previousSplitAgg, value, value);
              if (column.aggConfig.type.type === 'buckets') {
                previousSplitAgg = aggConfigResult;
              }
              return aggConfigResult;
            });

            converted.tables[tableIndex].rows.push(newRow);
          });
        } else {

          converted.tables.push({
            columns: table.columns,
            rows: table.rows.map(row => {
              let previousSplitAgg;
              return table.columns.map(column => {
                const value = row[column.id];
                const aggConfigResult = new AggConfigResult(column.aggConfig, previousSplitAgg, value, value);
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

VisResponseHandlersRegistryProvider.register(TableResponseHandlerProvider);

export { TableResponseHandlerProvider };
