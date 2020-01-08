/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { flatten } from 'lodash';
import { escapeKuery } from './escape_kuery';
import { sortPrefixFirst } from './sort_prefix_first';
import { isFilterable } from '../../../../../../src/plugins/data/public';
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
  const allFields = flatten(
    indexPatterns.map(indexPattern => {
      return indexPattern.fields.filter(isFilterable);
    })
  );
  return function getFieldSuggestions({ start, end, prefix, suffix, nestedPath = '' }) {
    const search = `${prefix}${suffix}`.trim().toLowerCase();
    const matchingFields = allFields.filter(field => {
      return (
        (!nestedPath ||
          (nestedPath &&
            field.subType &&
            field.subType.nested &&
            field.subType.nested.path.includes(nestedPath))) &&
        field.name.toLowerCase().includes(search) &&
        field.name !== search
      );
    });
    const sortedFields = sortPrefixFirst(matchingFields.sort(keywordComparator), search, 'name');
    const suggestions = sortedFields.map(field => {
      const remainingPath =
        field.subType && field.subType.nested
          ? field.subType.nested.path.slice(nestedPath ? nestedPath.length + 1 : 0)
          : '';
      const text =
        field.subType && field.subType.nested && remainingPath.length > 0
          ? `${escapeKuery(remainingPath)}:{ ${escapeKuery(
              field.name.slice(field.subType.nested.path.length + 1)
            )}  }`
          : `${escapeKuery(field.name.slice(nestedPath ? nestedPath.length + 1 : 0))} `;
      const description = getDescription(field.name);
      const cursorIndex =
        field.subType && field.subType.nested && remainingPath.length > 0
          ? text.length - 2
          : text.length;
      return { type, text, description, start, end, cursorIndex, field };
    });
    return suggestions;
  };
}

function keywordComparator(first, second) {
  const extensions = ['raw', 'keyword'];
  if (extensions.map(ext => `${first.name}.${ext}`).includes(second.name)) {
    return 1;
  } else if (extensions.map(ext => `${second.name}.${ext}`).includes(first.name)) {
    return -1;
  }
  return first.name.localeCompare(second.name);
}
