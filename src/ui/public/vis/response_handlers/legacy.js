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
import { VisResponseHandlersRegistryProvider } from '../../registry/vis_response_handlers';

const LegacyResponseHandlerProvider = function () {

  return {
    name: 'legacy',
    handler: function (table, dimensions) {
      return new Promise((resolve) => {
        const converted = { tables: [] };

        // check if there are buckets after the first metric
        const minMetricIndex = dimensions.metrics.reduce((a, b) => Math.min(a.accessor, b.accessor));
        const maxBucketIndex = dimensions.metrics.reduce((a, b) => Math.max(a.accessor, b.accessor));
        const metricsAtAllLevels = minMetricIndex < maxBucketIndex;

        const split = (dimensions.splitColumn || dimensions.splitRow);
        const numberOfMetrics = dimensions.metrics.length;
        const numberOfBuckets = dimensions.buckets.length;
        const metricsPerBucket = numberOfMetrics / numberOfBuckets;

        if (split) {
          const splitColumnIndex = split[0].accessor;
          const splitColumn = table.columns[splitColumnIndex];
          const splitMap = {};
          let splitIndex = 0;

          table.rows.forEach((row) => {
            const splitValue = row[splitColumn.id];

            if (!splitMap.hasOwnProperty(splitValue)) {
              splitMap[splitValue] = splitIndex++;
              const tableGroup = {
                $parent: converted,
                title: `${splitValue}: ${splitColumn.name}`,
                key: splitValue,
                tables: []
              };
              tableGroup.tables.push({
                $parent: tableGroup,
                columns: table.columns.filter((column, i) => {
                  const isSplitColumn = i === splitColumnIndex;
                  const isSplitMetric = metricsAtAllLevels && i > splitColumnIndex && i <= splitColumnIndex + metricsPerBucket;
                  return !isSplitColumn && !isSplitMetric;
                }),
                rows: []
              });

              converted.tables.push(tableGroup);
            }

            const tableIndex = splitMap[splitValue];
            const newRow = _.cloneDeep(row);
            delete newRow[splitColumn.accessor];

            converted.tables[tableIndex].tables[0].rows.push(newRow);
          });
        } else {

          converted.tables.push({
            columns: table.columns,
            rows: table.rows
          });
        }

        resolve(converted);
      });
    }
  };
};

VisResponseHandlersRegistryProvider.register(LegacyResponseHandlerProvider);

export { LegacyResponseHandlerProvider };
