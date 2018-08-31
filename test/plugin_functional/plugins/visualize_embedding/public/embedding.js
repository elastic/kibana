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

import { getVisualizeLoader } from 'ui/visualize';

export const embeddingSamples = [

  {
    id: 'timebased_no-datehistogram',
    title: 'Time based data',
    async run(domNode) {
      const loader = await getVisualizeLoader();
      return loader.embedVisualizationWithId(domNode, 'timebased_no-datehistogram', {});
    }
  }, {
    id: 'timebased_no-datehistogram_timerange',
    title: 'Time based data specifying timeRange',
    async run(domNode) {
      const loader = await getVisualizeLoader();
      return loader.embedVisualizationWithId(domNode, 'timebased_no-datehistogram', {
        timeRange: {
          from: '2015-09-20 20:00:00.000',
          to: '2015-09-21 20:00:00.000',
        }
      });
    }
  }

  /**
   * TODO:
   * timebased_no-datehistogram_query
   * timebased_no-datehistogram_filters
   * timebased_no-datehistogram_filters_query_timerange
   * timebased_with-datehistogram_filters
   * timebased_with-datehistogram_query
   * timebased_with-datehistogram_timerange
   * timebased_with-datehistogram_timerange-filters-query
   * timebased_with-datehistogram_searchcontext
   * timebased_with-datehistogram_searchcontext_timerange-filters-query
   *
   * same with no-timebased
   */


];
