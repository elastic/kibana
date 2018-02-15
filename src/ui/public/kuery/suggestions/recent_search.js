const type = 'recentSearch';
const description = 'Run this query you performed earlier';

export function getSuggestionsProvider({ persistedLog, query }) {
  return function getRecentSearchSuggestions() {
    const recentSearches = persistedLog.get();
    const matchingRecentSearches = recentSearches.filter(search => search.includes(query));
    const suggestions = matchingRecentSearches.map(recentSearch => {
      const text = recentSearch;
      const start = 0;
      const end = query.length;
      return { type, text, description, start, end };
    });
    return Promise.resolve(suggestions);
  };
}
