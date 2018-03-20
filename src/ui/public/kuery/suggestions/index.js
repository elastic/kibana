import { flatten, mapValues, uniq } from 'lodash';
import { fromKueryExpression } from '../ast';
import { getSuggestionsProvider as field } from './field';
import { getSuggestionsProvider as value } from './value';
import { getSuggestionsProvider as operator } from './operator';
import { getSuggestionsProvider as conjunction } from './conjunction';

const cursorSymbol = '@kuery-cursor@';

export function getSuggestionsProvider({ $http, config, indexPatterns }) {
  const getSuggestionsByType = mapValues({ field, value, operator, conjunction }, provider => {
    return provider({ $http, config, indexPatterns });
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
