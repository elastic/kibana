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

import { VisRequestHandlersRegistryProvider } from '../../registry/vis_request_handlers';
import { calculateObjectHash } from '../lib/calculate_object_hash';
import { getRequestInspectorStats, getResponseInspectorStats } from '../../courier/utils/courier_inspector_utils';
import { tabifyAggResponse } from '../../agg_response/tabify/tabify';

import { FormattedData } from '../../inspector/adapters';
import { getTime } from '../../timefilter/get_time';

const CourierRequestHandlerProvider = function () {

  /**
   * This function builds tabular data from the response and attaches it to the
   * inspector. It will only be called when the data view in the inspector is opened.
   */
  async function buildTabularInspectorData(vis, searchSource, aggConfigs) {
    const table = tabifyAggResponse(aggConfigs, searchSource.finalResponse, {
      partialRows: true,
      metricsAtAllLevels: vis.isHierarchical(),
    });
    const columns = table.columns.map((col, index) => {
      const field = col.aggConfig.getField();
      const isCellContentFilterable =
        col.aggConfig.isFilterable()
        && (!field || field.filterable);
      return ({
        name: col.name,
        field: `col${index}`,
        filter: isCellContentFilterable && ((value) => {
          const filter = col.aggConfig.createFilter(value.raw);
          vis.API.queryFilter.addFilters(filter);
        }),
        filterOut: isCellContentFilterable && ((value) => {
          const filter = col.aggConfig.createFilter(value.raw);
          filter.meta = filter.meta || {};
          filter.meta.negate = true;
          vis.API.queryFilter.addFilters(filter);
        }),
      });
    });
    const rows = table.rows.map(row => {
      return table.columns.reduce((prev, cur, index) => {
        const value = row[cur.id];
        const fieldFormatter = cur.aggConfig.fieldFormatter('text');
        prev[`col${index}`] = new FormattedData(value, fieldFormatter(value));
        return prev;
      }, {});
    });

    return { columns, rows };
  }

  return {
    name: 'courier',
    handler: function (vis, { searchSource, aggs, timeRange, query, filters, forceFetch, partialRows }) {

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
      // the spy panel wouldn't work otherwise.
      Object.defineProperty(requestSearchSource, 'history', {
        get() {
          return searchSource.history;
        },
        set(history) {
          return searchSource.history = history;
        }
      });

      requestSearchSource.setField('aggs', function () {
        return aggs.toDsl();
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

      const shouldQuery = (requestBodyHash) => {
        if (!searchSource.lastQuery || forceFetch) return true;
        if (searchSource.lastQuery !== requestBodyHash) return true;
        return false;
      };

      return new Promise((resolve, reject) => {
        return requestSearchSource.getSearchRequestBody().then(q => {
          const queryHash = calculateObjectHash(q);
          if (shouldQuery(queryHash)) {
            const lastAggConfig = aggs;
            vis.API.inspectorAdapters.requests.reset();
            const request = vis.API.inspectorAdapters.requests.start('Data', {
              description: `This request queries Elasticsearch to fetch the data for the visualization.`,
            });
            request.stats(getRequestInspectorStats(requestSearchSource));

            requestSearchSource.fetch().then(resp => {
              searchSource.lastQuery = queryHash;

              request
                .stats(getResponseInspectorStats(searchSource, resp))
                .ok({ json: resp });

              searchSource.rawResponse = resp;
              return _.cloneDeep(resp);
            }).then(async resp => {
              for (const agg of aggs) {
                if (_.has(agg, 'type.postFlightRequest')) {
                  resp = await agg.type.postFlightRequest(
                    resp,
                    aggs,
                    agg,
                    requestSearchSource,
                    vis.API.inspectorAdapters
                  );
                }
              }

              searchSource.finalResponse = resp;

              const parsedTimeRange = timeRange ? getTime(aggs.indexPattern, timeRange) : null;

              searchSource.tabifiedResponse = tabifyAggResponse(vis.getAggConfig(), resp, {
                metricsAtAllLevels: vis.isHierarchical(),
                partialRows,
                timeRange: parsedTimeRange ? parsedTimeRange.range : undefined,
              });

              vis.API.inspectorAdapters.data.setTabularLoader(
                () => buildTabularInspectorData(vis, searchSource, lastAggConfig),
                { returnsFormattedValues: true }
              );

              resolve(searchSource.tabifiedResponse);
            }).catch(e => reject(e));

            requestSearchSource.getSearchRequestBody().then(req => {
              request.json(req);
            });

          } else {
            resolve(searchSource.tabifiedResponse);
          }
        });
      });
    }
  };
};

VisRequestHandlersRegistryProvider.register(CourierRequestHandlerProvider);

export { CourierRequestHandlerProvider };
