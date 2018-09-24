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
import chrome from '../chrome';

export const Scanner = function ($http, { index, type } = {}) {
  if (!index) throw new Error('Expected index');
  if (!type) throw new Error('Expected type');
  if (!$http) throw new Error('Expected $http');

  this.$http = $http;
  this.index = index;
  this.type = type;
};

Scanner.prototype.start = function (searchBody) {
  const { addBasePath } = chrome;
  const scrollStartPath = addBasePath('/api/kibana/legacy_scroll_start');
  return this.$http.post(scrollStartPath, searchBody);
};

Scanner.prototype.continue = function (scrollId) {
  const { addBasePath } = chrome;
  const scrollContinuePath = addBasePath('/api/kibana/legacy_scroll_continue');
  return this.$http.post(scrollContinuePath, { scrollId });
};

Scanner.prototype.scanAndMap = function (searchString, options, mapFn) {
  const bool = { must: [], filter: [] };

  let scrollId;
  const allResults = {
    hits: [],
    total: 0
  };
  const opts = _.defaults(options || {}, {
    pageSize: 100,
    docCount: 1000
  });

  if (this.type) {
    bool.filter.push({
      bool: {
        should: [
          {
            term: {
              _type: this.type
            }
          },
          {
            term: {
              type: this.type
            }
          }
        ]
      }
    });
  }

  if (searchString) {
    bool.must.push({
      simple_query_string: {
        query: searchString + '*',
        fields: ['title^3', 'description'],
        default_operator: 'AND'
      }
    });
  } else {
    bool.must.push({
      match_all: {}
    });
  }

  return new Promise((resolve, reject) => {
    const getMoreUntilDone = (error, response) => {
      if (error) {
        reject(error);
        return;
      }
      const scanAllResults = opts.docCount === Infinity;
      allResults.total = scanAllResults ? response.hits.total : Math.min(response.hits.total, opts.docCount);
      scrollId = response._scroll_id || scrollId;

      let hits = response.hits.hits
        .slice(0, allResults.total - allResults.hits.length);

      hits = hits.map(hit => {
        if (hit._type === 'doc') {
          return {
            _id: hit._id.replace(`${this.type}:`, ''),
            _type: this.type,
            _source: hit._source[this.type],
            _meta: {
              savedObjectVersion: 2
            }
          };
        }

        return _.pick(hit, ['_id', '_type', '_source']);
      });

      if (mapFn) hits = hits.map(mapFn);

      allResults.hits =  allResults.hits.concat(hits);

      const collectedAllResults = allResults.total === allResults.hits.length;
      if (collectedAllResults) {
        resolve(allResults);
      } else {
        this.continue(scrollId)
          .then(response => getMoreUntilDone(null, response.data))
          .catch(error => getMoreUntilDone(error));
      }
    };

    const searchBody = {
      index: this.index,
      size: opts.pageSize,
      body: { query: { bool } },
    };
    this.start(searchBody)
      .then(response => getMoreUntilDone(null, response.data))
      .catch(error => getMoreUntilDone(error));
  });
};
