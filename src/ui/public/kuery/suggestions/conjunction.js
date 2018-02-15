const type = 'conjunction';

const conjunctions = {
  and: `<p>Requires that <span class="suggestionItem__callout">both arguments</span> joined together both return true</p>`,
  or: `<p>Requires <span class="suggestionItem__callout">only one of</span> the arguments joined together must return true</p>`
};

function getDescription(conjunction) {
  return conjunctions[conjunction];
}

export function getSuggestionsProvider() {
  return function getConjunctionSuggestions({ prefix, start }) {
    if (!prefix.endsWith(' ')) return [];
    const suggestions = Object.keys(conjunctions).map(conjunction => {
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
