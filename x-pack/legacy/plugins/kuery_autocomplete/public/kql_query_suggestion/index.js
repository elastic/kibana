/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten, uniq } from 'lodash';
import { getSuggestionsProvider as field } from './field';
import { getSuggestionsProvider as value } from './value';
import { getSuggestionsProvider as operator } from './operator';
import { getSuggestionsProvider as conjunction } from './conjunction';
import { esKuery } from '../../../../../../src/plugins/data/public';

const cursorSymbol = '@kuery-cursor@';
const providers = {
  field,
  value,
  operator,
  conjunction,
};

function dedup(suggestions) {
  return uniq(suggestions, ({ type, text, start, end }) => [type, text, start, end].join('|'));
}

const getProviderByType = (type, args) => providers[type](args);

export const setupKqlQuerySuggestionProvider = ({ uiSettings }) => ({
  indexPatterns,
  boolFilter,
  query,
  selectionStart,
  selectionEnd,
  signal,
}) => {
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
  const suggestionsByType = suggestionTypes.map(type =>
    getProviderByType(type, {
      config: uiSettings,
      indexPatterns,
      boolFilter,
    })(cursorNode, signal)
  );
  return Promise.all(suggestionsByType).then(suggestionsByType =>
    dedup(flatten(suggestionsByType))
  );
};
