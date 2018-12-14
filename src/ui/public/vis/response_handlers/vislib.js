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

import { LegacyResponseHandlerProvider } from './legacy';
import { BuildHierarchicalDataProvider } from '../../agg_response/hierarchical/build_hierarchical_data';
import { AggResponsePointSeriesProvider } from '../../agg_response/point_series/point_series';
import { VisResponseHandlersRegistryProvider } from '../../registry/vis_response_handlers';

function convertTableGroup(tableGroup, convertTable) {
  const tables = tableGroup.tables;
  const firstChild = tables[0];

  if (!tables.length) return;

  if (firstChild.columns) {
    const chart = convertTable(firstChild);
    // if chart is within a split, assign group title to its label
    if (tableGroup.$parent) {
      chart.label = tableGroup.title;
    }
    return chart;
  }

  const out = {};
  let outList;

  tables.forEach(function (table) {
    if (!outList) {
      const aggConfig = table.aggConfig;
      const direction = aggConfig.params.row ? 'rows' : 'columns';
      outList = out[direction] = [];
    }

    let output;
    if (output = convertTableGroup(table, convertTable)) {
      outList.push(output);
    }
  });

  return out;
}

const handlerFunction =  function (tableResponseProvider, convertTable) {
  return function (response) {
    return new Promise((resolve) => {
      return tableResponseProvider(response).then(tableGroup => {
        let converted = convertTableGroup(tableGroup, convertTable);
        if (!converted) {
          // mimic a row of tables that doesn't have any tables
          // https://github.com/elastic/kibana/blob/7bfb68cd24ed42b1b257682f93c50cd8d73e2520/src/kibana/components/vislib/components/zero_injection/inject_zeros.js#L32
          converted = { rows: [] };
        }

        converted.hits = response.rows.length;

        resolve(converted);
      });
    });
  };
};

const VislibSeriesResponseHandlerProvider = function (Private) {
  const tableResponseProvider = Private(LegacyResponseHandlerProvider).handler;
  const buildPointSeriesData = Private(AggResponsePointSeriesProvider);

  return {
    name: 'vislib_series',
    handler: handlerFunction(tableResponseProvider, buildPointSeriesData)
  };
};

const VislibSlicesResponseHandlerProvider = function (Private) {
  const buildHierarchicalData = Private(BuildHierarchicalDataProvider);
  const tableResponseProvider = Private(LegacyResponseHandlerProvider).handler;

  return {
    name: 'vislib_slices',
    handler: handlerFunction(tableResponseProvider, buildHierarchicalData)
  };
};



VisResponseHandlersRegistryProvider.register(VislibSeriesResponseHandlerProvider);
VisResponseHandlersRegistryProvider.register(VislibSlicesResponseHandlerProvider);

export { VislibSeriesResponseHandlerProvider, VislibSlicesResponseHandlerProvider };
