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
import { getTime } from 'ui/timefilter/get_time';

const TabifyResponseHandlerProvider = function (Private) {
  const aggResponse = Private(AggResponseIndexProvider);

  return {
    name: 'tabify',
    handler: function (vis, response) {
      return new Promise((resolve) => {
        const time = getTime(vis.indexPattern, vis.filters.timeRange);

        const tableGroup = aggResponse.tabify(vis.getAggConfig(), response, {
          metricsAtAllLevels: vis.isHierarchical(),
          partialRows: vis.params.showPartialRows,
          timeRange: time ? time.range : undefined,
        });

        resolve(tableGroup);
      });
    }
  };
};

VisResponseHandlersRegistryProvider.register(TabifyResponseHandlerProvider);

export { TabifyResponseHandlerProvider };
