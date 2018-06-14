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
import { SearchSourceProvider } from '../../courier/data_source/search_source';
import { VisRequestHandlersRegistryProvider } from '../../registry/vis_request_handlers';
import { calculateObjectHash } from '../lib/calculate_object_hash';

const CourierRequestHandlerProvider = function (Private, courier, timefilter) {
  const SearchSource = Private(SearchSourceProvider);

  return {
    name: 'courier',
    handler: function (vis, { searchSource, timeRange, query, filters, forceFetch }) {

      // Create a new search source that inherits the original search source
      // but has the propriate timeRange applied via a filter.
      // This is a temporary solution until we properly pass down all required
      // information for the request to the request handler (https://github.com/elastic/kibana/issues/16641).
      // Using callParentStartHandlers: true we make sure, that the parent searchSource
      // onSearchRequestStart will be called properly even though we use an inherited
      // search source.
      const timeFilterSearchSource = searchSource.makeChild();
      const requestSearchSource = timeFilterSearchSource.makeChild();

      // For now we need to mirror the history of the passed search source, since
      // the spy panel wouldn't work otherwise.
      Object.defineProperty(requestSearchSource, 'history', {
        get() {
          return searchSource.history;
        },
        set(history) {
          return searchSource.history = history;
        }
      });

      requestSearchSource.aggs(function () {
        return vis.getAggConfig().toDsl();
      });

      requestSearchSource.onRequestStart((searchSource, searchRequest) => {
        return vis.onSearchRequestStart(searchSource, searchRequest);
      });

      timeFilterSearchSource.set('filter', () => {
        return timefilter.get(searchSource.get('index'), timeRange);
      });

      requestSearchSource.set('filter', filters);
      requestSearchSource.set('query', query);

      const shouldQuery = (requestBodyHash) => {
        if (!searchSource.lastQuery || forceFetch) return true;
        if (searchSource.lastQuery !== requestBodyHash) return true;
        return false;
      };

      return new Promise((resolve, reject) => {
        return requestSearchSource.getSearchRequestBody().then(q => {
          const queryHash = calculateObjectHash(q);
          if (shouldQuery(queryHash)) {
            requestSearchSource.onResults().then(resp => {
              searchSource.lastQuery = queryHash;
              searchSource.rawResponse = resp;
              return _.cloneDeep(resp);
            }).then(async resp => {
              for (const agg of vis.getAggConfig()) {
                if (_.has(agg, 'type.postFlightRequest')) {
                  const nestedSearchSource = new SearchSource().inherits(requestSearchSource);
                  resp = await agg.type.postFlightRequest(resp, vis.aggs, agg, nestedSearchSource);
                }
              }

              searchSource.finalResponse = resp;
              resolve(resp);
            }).catch(e => reject(e));

            courier.fetch();
          } else {
            resolve(searchSource.finalResponse);
          }
        });
      });
    }
  };
};

VisRequestHandlersRegistryProvider.register(CourierRequestHandlerProvider);

export { CourierRequestHandlerProvider };
