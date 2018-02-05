const type = 'operator';

const operators = {
  '<=': {
    description: 'is LESS THAN OR EQUAL TO some value',
    fieldTypes: ['number', 'date', 'ip']
  },
  '>=': {
    description: 'is GREATER THAN OR EQUAL TO to some value',
    fieldTypes: ['number', 'date', 'ip']
  },
  '<': {
    description: 'is LESS THAN some value',
    fieldTypes: ['number', 'date', 'ip']
  },
  '>': {
    description: 'is GREATER THAN some value',
    fieldTypes: ['number', 'date', 'ip']
  },
  ':': {
    description: 'IS some value',
    fieldTypes: ['string', 'number', 'date', 'ip', 'geo_point', 'geo_shape']
  },
  ':*': {
    description: 'EXISTS'
  }
};

function getDescription({ fieldName, operator }) {
  const { description } = operators[operator];
  return `Filter results where ${fieldName} ${description}.`;
}

export function getSuggestionsProvider({ indexPattern }) {
  return function getOperatorSuggestions({ end, fieldName }) {
    const field = indexPattern.fields.byName[fieldName];
    if (!field) return [];
    const matchingOperators = Object.keys(operators).filter(operator => {
      const { fieldTypes } = operators[operator];
      return !fieldTypes || fieldTypes.includes(field.type);
    });
    const suggestions = matchingOperators.map(operator => {
      const text = operator + ' ';
      const description = getDescription({ fieldName, operator });
      return { type, text, description, start: end, end };
    });
    return Promise.resolve(suggestions);
  };
}
