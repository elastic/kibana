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

/**
 * This files shows a couple of examples how to use the visualize loader API
 * to embed visualizations.
 */

import { getVisualizeLoader } from 'ui/visualize';
import chrome from 'ui/chrome';

export const embeddingSamples = [
  {
    id: 'none',
    title: 'No parameters',
    async run(domNode, id) {
      // You always need to retrieve the visualize loader for embedding visualizations.
      const loader = await getVisualizeLoader();
      // Use the embedVisualizationWithId method to embed a visualization by its id. The id is the id of the
      // saved object in the .kibana index (you can find the id via Management -> Saved Objects).
      //
      // Pass in a DOM node that you want to embed that visualization into. Note: the loader will
      // use the size of that DOM node.
      //
      // The call will return a handler for the visualization with methods to interact with it.
      // Check the components/main.js file to see how this handler is used. Most important: you need to call
      // `destroy` on the handler once you are about to remove the visualization from the DOM.
      //
      // Note: If the visualization you want to embed contains date histograms with an auto interval, you need
      // to specify the timeRange parameter (see below).
      return loader.embedVisualizationWithId(domNode, id, {});
    },
  },
  {
    id: 'timerange',
    title: 'timeRange',
    async run(domNode, id) {
      const loader = await getVisualizeLoader();
      // If you want to filter down the data to a specific time range, you can specify a
      // timeRange in the parameters to the embedding call.
      // You can either use an absolute time range as seen below. You can also specify
      // a datemath string, like "now-7d", "now-1w/w" for the from or to key.
      // You can also directly assign a moment JS or regular JavaScript Date object.
      return loader.embedVisualizationWithId(domNode, id, {
        timeRange: {
          from: '2015-09-20 20:00:00.000',
          to: '2015-09-21 20:00:00.000',
        },
      });
    },
  },
  {
    id: 'query',
    title: 'query',
    async run(domNode, id) {
      const loader = await getVisualizeLoader();
      // You can specify a query that should filter down the data via the query parameter.
      // It must have a language key which must be one of the supported query languages of Kibana,
      // which are at the moment: 'lucene' or 'kquery'.
      // The query key must then hold the actual query in the specified language for filtering.
      return loader.embedVisualizationWithId(domNode, id, {
        query: {
          language: 'lucene',
          query: 'extension.raw:jpg',
        },
      });
    },
  },
  {
    id: 'filters',
    title: 'filters',
    async run(domNode, id) {
      const loader = await getVisualizeLoader();
      // You can specify an array of filters that should apply to the query.
      // The format of a filter must match the format the filter bar is using internally.
      // This has a query key, which holds the query part of an Elasticsearch query
      // and a meta key allowing to set some meta values, most important for this API
      // the `negate` option to negate the filter.
      return loader.embedVisualizationWithId(domNode, id, {
        filters: [
          {
            query: {
              bool: {
                should: [
                  { match_phrase: { 'extension.raw': 'jpg' } },
                  { match_phrase: { 'extension.raw': 'png' } },
                ],
              },
            },
            meta: {
              negate: true,
            },
          },
        ],
      });
    },
  },
  {
    id: 'filters_query_timerange',
    title: 'filters & query & timeRange',
    async run(domNode, id) {
      const loader = await getVisualizeLoader();
      // You an of course combine timeRange, query and filters options all together
      // to filter the data in the embedded visualization.
      return loader.embedVisualizationWithId(domNode, id, {
        timeRange: {
          from: '2015-09-20 20:00:00.000',
          to: '2015-09-21 20:00:00.000',
        },
        query: {
          language: 'lucene',
          query: 'bytes:>2000',
        },
        filters: [
          {
            query: {
              bool: {
                should: [
                  { match_phrase: { 'extension.raw': 'jpg' } },
                  { match_phrase: { 'extension.raw': 'png' } },
                ],
              },
            },
            meta: {
              negate: true,
            },
          },
        ],
      });
    },
  },
  {
    id: 'savedobject_filter_query_timerange',
    title: 'filters & query & time (use saved object)',
    async run(domNode, id) {
      const loader = await getVisualizeLoader();
      // Besides embedding via the id of the visualizataion, the API offers the possibility to
      // embed via the saved visualization object.
      //
      // WE ADVISE YOU NOT TO USE THIS INSIDE ANY PLUGIN!
      //
      // Since the format of the saved visualization object will change in the future and because
      // this still requires you to talk to old Angular code, we do not encourage you to use this
      // way of embedding in any plugin. It's likely it will be removed or changed in a future version.
      const $injector = await chrome.dangerouslyGetActiveInjector();
      const savedVisualizations = $injector.get('savedVisualizations');
      const savedVis = await savedVisualizations.get(id);
      return loader.embedVisualizationWithSavedObject(domNode, savedVis, {
        timeRange: {
          from: '2015-09-20 20:00:00.000',
          to: '2015-09-21 20:00:00.000',
        },
        query: {
          language: 'lucene',
          query: 'bytes:>2000',
        },
        filters: [
          {
            query: {
              bool: {
                should: [
                  { match_phrase: { 'extension.raw': 'jpg' } },
                  { match_phrase: { 'extension.raw': 'png' } },
                ],
              },
            },
            meta: {
              negate: true,
            },
          },
        ],
      });
    },
  },
];
