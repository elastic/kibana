import { flatten } from 'lodash';
import { fromKueryExpression } from '../ast';
import * as field from './field';
import * as value from './value';
import * as operator from './operator';
import * as conjunction from './conjunction';
import * as recentSearch from './recent_search';

const suggestionProviders = { field, value, operator, conjunction, recentSearch };
const cursorMarker = '\0';

export function getSuggestionsProvider({ $http, config, indexPattern, persistedLog }) {
  return ({ query, selectionStart, selectionEnd }) => {
    const markedQuery = `${query.substr(0, selectionStart)}${cursorMarker}${query.substr(selectionEnd)}`;

    let cursorNode;
    try {
      cursorNode = fromKueryExpression(markedQuery, { parseCursor: true });
    } catch (e) {
      cursorNode = {};
    }

    const { suggestionTypes = [] } = cursorNode;
    return Promise.all([...suggestionTypes, 'recentSearch'].map(type => {
      const { getSuggestionsProvider } = suggestionProviders[type];
      const getSuggestions = getSuggestionsProvider({ $http, config, indexPattern, persistedLog, query });
      return getSuggestions(cursorNode);
    })).then(suggestionsByType => {
      return flatten(suggestionsByType);
    });
  };
}
