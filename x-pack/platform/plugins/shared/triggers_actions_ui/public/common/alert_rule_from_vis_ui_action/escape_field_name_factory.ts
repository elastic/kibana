/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sanitazeESQLInput } from '@kbn/esql-utils';
import { parse, walk, type ESQLColumn, type ESQLFunction } from '@kbn/esql-language';
import { i18n } from '@kbn/i18n';
import { snakeCase } from 'lodash';

export const escapeFieldNameFactory = (query: string | null) => {
  const { root } = parse(query ?? '');
  const columns: ESQLColumn[] = [];
  const functions: ESQLFunction[] = [];

  walk(root, {
    visitColumn: (node) => columns.push(node),
  });

  walk(root, {
    visitFunction: (node) => functions.push(node),
  });

  let renameQuery = '';
  const escapeFieldName = (fieldName: string) => {
    if (!fieldName || fieldName === 'undefined') return missingSourceFieldPlaceholder;
    const column = columns.find((col) => col.name === fieldName);
    if (column) {
      return column.name;
    }

    // Find all ESQL functions and rename them
    const WHITESPACE_AFTER_COMMA_REGEX = /, +/g;
    const esqlFunction = functions.find(
      (func) => func.text === fieldName.replace(WHITESPACE_AFTER_COMMA_REGEX, ',')
    );
    if (esqlFunction) {
      const colName = `_${snakeCase(fieldName)}`;
      const sanitizedFieldName = sanitazeESQLInput(esqlFunction.text);
      // Add this to the renameQuery as a side effect
      const renameClause = `| RENAME ${sanitizedFieldName} as ${colName} `;
      if (!renameQuery.includes(renameClause)) renameQuery += renameClause;
      return colName;
    }

    return fieldName;
  };

  const stringValueToESQLCondition = (fieldName: string, v: string | number | null | undefined) => {
    try {
      // If the value is a string containing a comma, first attempt to parse it as a JSON-formatted array
      if (typeof v === 'string' && v.includes(',')) {
        const stringToParse = v.startsWith('[')
          ? v
          : `[${v
              .split(',')
              .map((item) => `"${item}"`)
              .join()}]`;
        const parsed = JSON.parse(stringToParse);
        if (Array.isArray(parsed)) {
          return parsed
            .map(
              (multiVal) => `MATCH(${escapeFieldName(fieldName)}, ${formatStringForESQL(multiVal)})`
            )
            .join(' AND ');
        }
      }
    } catch {
      // Do nothing, continue to return statement
    }
    return `${escapeFieldName(fieldName)} == ${
      typeof v === 'number' ? v : formatStringForESQL(v ?? '')
    }`;
  };

  const getRenameQuery = () => renameQuery.slice(); // Copy string to keep it private

  return { escapeFieldName, stringValueToESQLCondition, getRenameQuery };
};

const formatStringForESQL = (value: string) => {
  let sanitizedValue = value;
  // This is how you escape backslashes in Javascript. This language was invented in 10 days in 1995 and now we have to do this

  // This translates to "If value includes a '\' character" in reasonable human being language
  if (value.includes('\\')) {
    // Split value by every '\' and replace them all with '\\'. I promise this is what this code means.
    sanitizedValue = value.split('\\').join('\\\\');
  }
  return `"${sanitizedValue}"`;
};

const missingSourceFieldPlaceholder = i18n.translate(
  'xpack.triggersActionsUI.alertRuleFromVis.fieldNamePlaceholder',
  {
    defaultMessage: '[FIELD NAME]',
  }
);
