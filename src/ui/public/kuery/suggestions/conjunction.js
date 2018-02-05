const type = 'conjunction';

const conjunctions = ['and', 'or'];

function getDescription(conjunction) {
  return `Add an ${conjunction.toUpperCase()} clause.`;
}

export function getSuggestionsProvider() {
  return function getConjunctionSuggestions({ prefix, start }) {
    if (!prefix.endsWith(' ')) return [];
    const suggestions = conjunctions.map(conjunction => {
      const text = conjunction + ' ';
      const description = getDescription(conjunction);
      return {
        type,
        text,
        description,
        start: prefix.length + start,
        end: prefix.length + start
      };
    });
    return Promise.resolve(suggestions);
  };
}
