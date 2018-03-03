import { flatten } from 'lodash';
import { fromKqlExpression } from '../ast';
import * as field from './field';
import * as value from './value';
import * as operator from './operator';
import * as conjunction from './conjunction';
import * as recentSearch from './recent_search';

const suggestionProviders = { field, value, operator, conjunction, recentSearch };
const cursorMarker = '\0';

export function getSuggestionsProvider({ $http, indexPattern, persistedLog }) {
  return ({ query, selectionStart, selectionEnd }) => {
    const markedQuery = `${query.substr(0, selectionStart)}${cursorMarker}${query.substr(selectionEnd)}`;
    const cursorNode = fromKqlExpression(markedQuery, { parseCursor: true });
    const { suggestionTypes = [] } = cursorNode;
    return Promise.all([...suggestionTypes, 'recentSearch'].map(type => {
      const { getSuggestionsProvider } = suggestionProviders[type];
      const getSuggestions = getSuggestionsProvider({ $http, indexPattern, persistedLog, query });
      return getSuggestions(cursorNode);
    })).then(suggestionsByType => {
      return flatten(suggestionsByType);
    });
  };
}
