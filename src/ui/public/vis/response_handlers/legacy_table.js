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

import get from 'lodash.get';
import moment from 'moment';
import AggConfigResult from '../../vis/agg_config_result';

function keyRowsByValue(rows, key) {
  return rows.reduce((acc, row) => {
    const { [key]: splitValue, ...rest } = row;
    acc[splitValue] = [...(acc[splitValue] || []), rest];
    return acc;
  }, {});
}

function formatSplitFieldValue(aggConfig, value) {
  if (get(aggConfig, 'params.field.type') === 'date') {
    return moment(parseInt(value)).format('YYYY-MM-DD');
  }
  return value;
}

export function legacyTableResponseHandler() {
  return function handler(table) {
    return new Promise(resolve => {
      const splitTable = (columns, rows, $parent) => {
        const splitColumn = columns.find(column => get(column, 'aggConfig.schema.name') === 'split');

        if (!splitColumn) {
          return [{
            $parent,
            columns: columns.map(column => ({ title: column.name, ...column })),
            rows: rows.map(row => {
              return columns.map(column => {
                return new AggConfigResult(column.aggConfig, $parent, row[column.id], row[column.id]);
              });
            }),
            aggConfig: (column) => column.aggConfig,
          }];
        }

        const splitColumnIndex = columns.findIndex(column => column.id === splitColumn.id);
        const rowsByColumnValue = keyRowsByValue(rows, splitColumn.id);
        const filteredColumns = columns
          .filter((column, i) => i !== splitColumnIndex)
          .map(column => ({ title: column.name, ...column }));

        return Object.keys(rowsByColumnValue).map(splitValue => {
          const $newParent = new AggConfigResult(splitColumn.aggConfig, $parent, splitValue, splitValue);
          return {
            $parent: $newParent,
            aggConfig: splitColumn.aggConfig,
            title: `${formatSplitFieldValue(splitColumn.aggConfig, splitValue)}: ${splitColumn.aggConfig.makeLabel()}`,
            key: splitValue,
            tables: splitTable(filteredColumns, rowsByColumnValue[splitValue], $newParent),
          };
        });
      };

      resolve({ tables: splitTable(table.columns, table.rows, null) });
    });
  };
}
