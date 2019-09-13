/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { flatten } from 'lodash';
import { escapeKuery } from './escape_kuery';
import { sortPrefixFirst } from 'ui/utils/sort_prefix_first';
import { isFilterable } from 'ui/index_patterns';
import { FormattedMessage } from '@kbn/i18n/react';


const type = 'field';

function getDescription(fieldName) {
  return (
    <p>
      <FormattedMessage
        id="xpack.kueryAutocomplete.filterResultsDescription"
        defaultMessage="Filter results that contain {fieldName}"
        values={{ fieldName: <span className="kbnSuggestionItem__callout">{fieldName}</span> }}
      />
    </p>
  );
}

export function getSuggestionsProvider({ indexPatterns }) {
  const allFields = flatten(indexPatterns.map(indexPattern => {
    return indexPattern.fields.filter(isFilterable);
  }));
  return function getFieldSuggestions({ start, end, prefix, suffix, nestedPath = '' }) {
    const search = `${nestedPath ? `${nestedPath}.` : ''}${prefix}${suffix}`.trim().toLowerCase();
    const fieldNames = allFields.map(field => field.name);
    const matchingFieldNames = fieldNames.filter(name => name.toLowerCase().includes(search) && name !== search);
    const sortedFieldNames = sortPrefixFirst(matchingFieldNames.sort(keywordComparator), search);
    const suggestions = sortedFieldNames.map(fieldName => {
      const field = allFields.find(patternField => patternField.name === fieldName);
      const remainingPath = field.subType && field.subType.nested
        ? field.subType.nested.path.slice(nestedPath ? nestedPath.length + 1 : 0)
        : '';
      const text = field.subType && field.subType.nested && remainingPath.length > 0
        ? `${escapeKuery(remainingPath)}:{ ${escapeKuery(fieldName.slice(field.subType.nested.path.length + 1))} }`
        : `${escapeKuery(fieldName.slice(nestedPath ? nestedPath.length + 1 : 0))} `;
      const description = getDescription(fieldName);
      const cursorIndex = field.subType && field.subType.nested
        ? text.length - 2
        : text.length;
      return { type, text, description, start, end, cursorIndex };
    });
    return suggestions;
  };
}

function keywordComparator(first, second) {
  const extensions = ['raw', 'keyword'];
  if (extensions.map(ext => `${first}.${ext}`).includes(second)) {
    return 1;
  } else if (extensions.map(ext => `${second}.${ext}`).includes(first)) {
    return -1;
  }
  return first.localeCompare(second);
}
