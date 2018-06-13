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

import 'isomorphic-fetch';
import { flatten, memoize } from 'lodash';
import { escapeQuotes } from './escape_kuery';
import { kfetch } from '../../kfetch';

const type = 'value';

const requestSuggestions = memoize((query, field, boolFilter) => {
  return kfetch({
    pathname: `/api/kibana/suggestions/values/${field.indexPatternTitle}`,
    method: 'POST',
    body: JSON.stringify({ query, field: field.name, boolFilter }),
  });
}, resolver);

export function getSuggestionsProvider({ config, indexPatterns, boolFilter }) {
  const allFields = flatten(
    indexPatterns.map(indexPattern => {
      return indexPattern.fields.map(field => ({
        ...field,
        indexPatternTitle: indexPattern.title,
      }));
    })
  );
  const shouldSuggestValues = config.get('filterEditor:suggestValues');

  return function getValueSuggestions({
    start,
    end,
    prefix,
    suffix,
    fieldName,
  }) {
    const fields = allFields.filter(field => field.name === fieldName);
    const query = `${prefix}${suffix}`;

    const suggestionsByField = fields.map(field => {
      if (field.type === 'boolean') {
        return wrapAsSuggestions(start, end, query, ['true', 'false']);
      } else if (
        !shouldSuggestValues ||
        !field.aggregatable ||
        field.type !== 'string'
      ) {
        return [];
      }

      return requestSuggestions(query, field, boolFilter).then(data => {
        const quotedValues = data.map(value => `"${escapeQuotes(value)}"`);
        return wrapAsSuggestions(start, end, query, quotedValues);
      });
    });

    return Promise.all(suggestionsByField).then(suggestions =>
      flatten(suggestions)
    );
  };
}

function wrapAsSuggestions(start, end, query, values) {
  return values
    .filter(value => value.toLowerCase().includes(query.toLowerCase()))
    .map(value => {
      const text = `${value} `;
      return { type, text, start, end };
    });
}

function resolver(query, field, boolFilter) {
  // Only cache results for a minute
  const ttl = Math.floor(Date.now() / 1000 / 60);
  return [ttl, query, field.indexPatternTitle, field.name, JSON.stringify(boolFilter)].join('|');
}
