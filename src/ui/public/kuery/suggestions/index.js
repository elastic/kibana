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

import { flatten, mapValues, uniq } from 'lodash';
import { fromKueryExpression } from '../ast';
import { getSuggestionsProvider as field } from './field';
import { getSuggestionsProvider as value } from './value';
import { getSuggestionsProvider as operator } from './operator';
import { getSuggestionsProvider as conjunction } from './conjunction';

const cursorSymbol = '@kuery-cursor@';

export function getSuggestionsProvider({ config, indexPatterns, boolFilter }) {
  const getSuggestionsByType = mapValues({ field, value, operator, conjunction }, provider => {
    return provider({ config, indexPatterns, boolFilter });
  });

  return function getSuggestions({ query, selectionStart, selectionEnd }) {
    const cursoredQuery = `${query.substr(0, selectionStart)}${cursorSymbol}${query.substr(selectionEnd)}`;

    let cursorNode;
    try {
      cursorNode = fromKueryExpression(cursoredQuery, { cursorSymbol, parseCursor: true });
    } catch (e) {
      cursorNode = {};
    }

    const { suggestionTypes = [] } = cursorNode;
    const suggestionsByType = suggestionTypes.map(type => {
      return getSuggestionsByType[type](cursorNode);
    });
    return Promise.all(suggestionsByType)
      .then(suggestionsByType => dedup(flatten(suggestionsByType)));
  };
}

function dedup(suggestions) {
  return uniq(suggestions, ({ type, text, start, end }) => [type, text, start, end].join('|'));
}
