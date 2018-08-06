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

import { AggResponseIndexProvider } from '../../agg_response';
import { TableResponseHandlerProvider } from './table';
import { VisResponseHandlersRegistryProvider } from '../../registry/vis_response_handlers';

const BasicResponseHandlerProvider = function (Private) {
  const aggResponse = Private(AggResponseIndexProvider);
  const tableResponseProvider = Private(TableResponseHandlerProvider).handler;

  function convertTableGroup(vis, tableGroup) {
    const tables = tableGroup.tables;
    const firstChild = tables[0];

    if (firstChild.columns) {

      const chart = convertTable(vis, firstChild);
      // if chart is within a split, assign group title to its label
      if (tableGroup.$parent) {
        chart.label = tableGroup.title;
      }
      return chart;
    }

    if (!tables.length) return;
    if (tables.length === 1) {
      return convertTable(vis, tables[0]);
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
      if (output = convertTableGroup(vis, table)) {
        outList.push(output);
      }
    });

    return out;
  }

  function convertTable(vis, table) {
    return vis.type.responseConverter ? vis.type.responseConverter(vis, table) : table;
  }

  return {
    name: 'basic',
    handler: function (vis, response) {
      return new Promise((resolve) => {
        if (vis.isHierarchical()) {
          // the hierarchical converter is very self-contained (woot!)
          // todo: it should be updated to be based on tabified data just as other responseConverters
          resolve(aggResponse.hierarchical(vis, response));
        }

        return tableResponseProvider(vis, response).then(tableGroup => {
          let converted = convertTableGroup(vis, tableGroup);
          if (!converted) {
            // mimic a row of tables that doesn't have any tables
            // https://github.com/elastic/kibana/blob/7bfb68cd24ed42b1b257682f93c50cd8d73e2520/src/kibana/components/vislib/components/zero_injection/inject_zeros.js#L32
            converted = { rows: [] };
          }

          converted.hits = response.hits.total;

          resolve(converted);
        });


      });
    }
  };
};

VisResponseHandlersRegistryProvider.register(BasicResponseHandlerProvider);

export { BasicResponseHandlerProvider };
