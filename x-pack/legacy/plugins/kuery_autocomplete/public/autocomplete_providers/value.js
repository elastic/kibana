/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten } from 'lodash';
import { escapeQuotes } from './escape_kuery';
import { npStart } from 'ui/new_platform';

const type = 'value';

export function getSuggestionsProvider({ indexPatterns, boolFilter }) {
  const allFields = flatten(
    indexPatterns.map(indexPattern => {
      return indexPattern.fields.map(field => ({
        ...field,
        indexPatternTitle: indexPattern.title,
      }));
    })
  );

  return function getValueSuggestions({ start, end, prefix, suffix, fieldName }) {
    const fields = allFields.filter(field => field.name === fieldName);
    const query = `${prefix}${suffix}`;
    const { getSuggestions } = npStart.plugins.data;

    const suggestionsByField = fields.map(field => {
      return getSuggestions(field.indexPatternTitle, field, query, boolFilter).then(data => {
        const quotedValues = data.map(value =>
          typeof value === 'string' ? `"${escapeQuotes(value)}"` : `${value}`
        );
        return wrapAsSuggestions(start, end, query, quotedValues);
      });
    });

    return Promise.all(suggestionsByField).then(suggestions => flatten(suggestions));
  };
}

function wrapAsSuggestions(start, end, query, values) {
  return values
    .filter(value => value.toLowerCase().includes(query.toLowerCase()))
    .map(value => {
      const text = `${value} `;
      return { type, text, start, end };
    });
}
