/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten, mapValues, uniq } from 'lodash';
import { getSuggestionsProvider as field } from './field';
import { getSuggestionsProvider as value } from './value';
import { getSuggestionsProvider as operator } from './operator';
import { getSuggestionsProvider as conjunction } from './conjunction';
import { esKuery } from '../../../../../../src/plugins/data/public';

const cursorSymbol = '@kuery-cursor@';

function dedup(suggestions) {
  return uniq(suggestions, ({ type, text, start, end }) => [type, text, start, end].join('|'));
}

export const kueryProvider = ({ config, indexPatterns, boolFilter }) => {
  const getSuggestionsByType = mapValues({ field, value, operator, conjunction }, provider => {
    return provider({ config, indexPatterns, boolFilter });
  });

  return function getSuggestions({ query, selectionStart, selectionEnd, signal }) {
    const cursoredQuery = `${query.substr(0, selectionStart)}${cursorSymbol}${query.substr(
      selectionEnd
    )}`;

    let cursorNode;
    try {
      cursorNode = esKuery.fromKueryExpression(cursoredQuery, { cursorSymbol, parseCursor: true });
    } catch (e) {
      cursorNode = {};
    }

    const { suggestionTypes = [] } = cursorNode;
    const suggestionsByType = suggestionTypes.map(type => {
      return getSuggestionsByType[type](cursorNode, signal);
    });
    return Promise.all(suggestionsByType).then(suggestionsByType =>
      dedup(flatten(suggestionsByType))
    );
  };
};
