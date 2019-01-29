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

import { cloneDeep, has } from 'lodash';
import { i18n } from '@kbn/i18n';
import { VisRequestHandlersRegistryProvider } from '../../registry/vis_request_handlers';
import { calculateObjectHash } from '../lib/calculate_object_hash';
import { getRequestInspectorStats, getResponseInspectorStats } from '../../courier/utils/courier_inspector_utils';
import { tabifyAggResponse } from '../../agg_response/tabify/tabify';
import { buildTabularInspectorData } from '../../inspector/build_tabular_inspector_data';
import { getTime } from '../../timefilter/get_time';

const CourierRequestHandlerProvider = function () {

  return {
    name: 'courier',
    handler: async function ({
      searchSource,
      aggs,
      timeRange,
      query,
      filters,
      forceFetch,
      partialRows,
      metricsAtAllLevels,
      inspectorAdapters,
      minimalColumns,
      queryFilter
    }) {

      // Create a new search source that inherits the original search source
      // but has the appropriate timeRange applied via a filter.
      // This is a temporary solution until we properly pass down all required
      // information for the request to the request handler (https://github.com/elastic/kibana/issues/16641).
      // Using callParentStartHandlers: true we make sure, that the parent searchSource
      // onSearchRequestStart will be called properly even though we use an inherited
      // search source.
      const timeFilterSearchSource = searchSource.createChild({ callParentStartHandlers: true });
      const requestSearchSource = timeFilterSearchSource.createChild({ callParentStartHandlers: true });

      aggs.setTimeRange(timeRange);

      // For now we need to mirror the history of the passed search source, since
      // the request inspector wouldn't work otherwise.
      Object.defineProperty(requestSearchSource, 'history', {
        get() {
          return searchSource.history;
        },
        set(history) {
          return searchSource.history = history;
        }
      });

      requestSearchSource.setField('aggs', function () {
        return aggs.toDsl(metricsAtAllLevels);
      });

      requestSearchSource.onRequestStart((searchSource, searchRequest) => {
        return aggs.onSearchRequestStart(searchSource, searchRequest);
      });

      if (timeRange) {
        timeFilterSearchSource.setField('filter', () => {
          return getTime(searchSource.getField('index'), timeRange);
        });
      }

      requestSearchSource.setField('filter', filters);
      requestSearchSource.setField('query', query);

      const reqBody = await requestSearchSource.getSearchRequestBody();

      const queryHash = calculateObjectHash(reqBody);
      // We only need to reexecute the query, if forceFetch was true or the hash of the request body has changed
      // since the last request
      const shouldQuery = forceFetch || (searchSource.lastQuery !== queryHash);

      if (shouldQuery) {
        inspectorAdapters.requests.reset();
        const request = inspectorAdapters.requests.start(
          i18n.translate('common.ui.vis.courier.inspector.dataRequest.title', { defaultMessage: 'Data' }),
          {
            description: i18n.translate('common.ui.vis.courier.inspector.dataRequest.description',
              { defaultMessage: 'This request queries Elasticsearch to fetch the data for the visualization.' }),
          }
        );
        request.stats(getRequestInspectorStats(requestSearchSource));

        try {
          const response = await requestSearchSource.fetch();

          searchSource.lastQuery = queryHash;

          request
            .stats(getResponseInspectorStats(searchSource, response))
            .ok({ json: response });

          searchSource.rawResponse = response;
        } catch(e) {
          // Log any error during request to the inspector
          request.error({ json: e });
          throw e;
        } finally {
          // Add the request body no matter if things went fine or not
          requestSearchSource.getSearchRequestBody().then(req => {
            request.json(req);
          });
        }
      }

      let resp = cloneDeep(searchSource.rawResponse);
      for (const agg of aggs) {
        if (has(agg, 'type.postFlightRequest')) {
          resp = await agg.type.postFlightRequest(
            resp,
            aggs,
            agg,
            requestSearchSource,
            inspectorAdapters
          );
        }
      }

      searchSource.finalResponse = resp;

      const parsedTimeRange = timeRange ? getTime(aggs.indexPattern, timeRange) : null;
      const tabifyParams = {
        minimalColumns,
        partialRows,
        timeRange: parsedTimeRange ? parsedTimeRange.range : undefined,
      };

      const tabifyCacheHash = calculateObjectHash({ tabifyAggs: aggs, ...tabifyParams });
      // We only need to reexecute tabify, if either we did a new request or some input params to tabify changed
      const shouldCalculateNewTabify = shouldQuery || (searchSource.lastTabifyHash !== tabifyCacheHash);

      if (shouldCalculateNewTabify) {
        searchSource.lastTabifyHash = tabifyCacheHash;
        searchSource.tabifiedResponse = tabifyAggResponse(aggs, searchSource.finalResponse, tabifyParams);
      }

      inspectorAdapters.data.setTabularLoader(
        () => buildTabularInspectorData(searchSource.tabifiedResponse, queryFilter),
        { returnsFormattedValues: true }
      );

      return searchSource.tabifiedResponse;
    }
  };
};

VisRequestHandlersRegistryProvider.register(CourierRequestHandlerProvider);

export { CourierRequestHandlerProvider };
