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

import { resolve as resolveUrl } from 'url';
import { pick, mapValues, get } from 'lodash';
import { IndexPatternMissingIndices } from '../errors';
import { kfetch } from 'ui/kfetch';

const API_BASE_URL = '/api/index_patterns/';

function join(...uriComponents) {
  return uriComponents.filter(Boolean).map(encodeURIComponent).join('/');
}

function getQuery(query) {
  const noNullsQuery = pick(query, value => value != null);
  return mapValues(noNullsQuery, value => (
    Array.isArray(value) ? JSON.stringify(value) : value
  ));
}

function getPath(path) {
  return resolveUrl(API_BASE_URL, join(...path));
}

function request({ method, path, query }) {
  return kfetch({ method, pathname: path, query })
    .catch((fetchError) => {
      if (get(fetchError, 'res.status') === 404 && get(fetchError, 'body.code') === 'no_matching_indices') {
        throw new IndexPatternMissingIndices(fetchError.message);
      }

      throw fetchError;
    });
}

export class IndexPatternsApiClient {
  getFieldsForTimePattern(options = {}) {
    const {
      pattern,
      lookBack,
      metaFields,
    } = options;

    const path = getPath(['_fields_for_time_pattern']);
    const query = getQuery({
      pattern,
      look_back: lookBack,
      meta_fields: metaFields,
    });

    return request({ method: 'GET', path, query }).then(resp => resp.fields);
  }

  getFieldsForWildcard(options = {}) {
    const {
      pattern,
      metaFields,
    } = options;

    const path = getPath(['_fields_for_wildcard']);
    const query = getQuery({
      pattern,
      meta_fields: metaFields,
    });

    return request({ method: 'GET', path, query }).then(resp => resp.fields);
  }
}
