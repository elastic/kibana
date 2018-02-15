const type = 'conjunction';

const conjunctions = ['and', 'or'];

function getDescription(conjunction) {
  if (conjunction === 'and') {
    return `<p>Requires that <span class="suggestionItem__callout">both arguments</span> joined together both return true</p>`;
  } else if (conjunction === 'or') {
    return `<p>Requires <span class="suggestionItem__callout">only one of</span> the arguments joined together must return true</p>`;
  } else {
    return `<p>Add an ${conjunction.toUpperCase()} clause</p>`;
  }
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
