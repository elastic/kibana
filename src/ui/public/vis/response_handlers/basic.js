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

import { VisResponseHandlersRegistryProvider } from '../../registry/vis_response_handlers';

const BasicResponseHandlerProvider = function (Private) {
  const aggResponse = Private(AggResponseIndexProvider);

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

        const table = aggResponse.tabify(vis.getAggConfig(), response);

        let converted = convertTable(vis, table);
        if (!converted) {
          // mimic a row of tables that doesn't have any tables
          // https://github.com/elastic/kibana/blob/7bfb68cd24ed42b1b257682f93c50cd8d73e2520/src/kibana/components/vislib/components/zero_injection/inject_zeros.js#L32
          converted = { rows: [] };
        }

        converted.hits = response.hits.total;

        resolve(converted);
      });
    }
  };
};

VisResponseHandlersRegistryProvider.register(BasicResponseHandlerProvider);

export { BasicResponseHandlerProvider };
