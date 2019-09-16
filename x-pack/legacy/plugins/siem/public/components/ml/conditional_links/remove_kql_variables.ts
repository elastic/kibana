/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RisonValue, encode } from 'rison-node';
import { decodeRison, isRisonObject, isRegularString } from './rison_helpers';

export const operators = ['and', 'or', 'not'];

export const removeKqlVariablesUsingRegex = (expression: string) => {
  const myRegexp = /(\s+)*(and|or|not){0,1}(\s+)*([\w\.\-\[\]]+)\s*:\s*"(\$[\w\.\-\(\)\[\]]+\$)"(\s+)*(and|or|not){0,1}(\s+)*/g;
  return expression.replace(myRegexp, replacement);
};

export const replacement = (match: string, ...parts: string[]): string => {
  if (parts == null) {
    return '';
  }
  const operatorsMatched = parts.reduce<string[]>(
    (accum, part) => (part != null && operators.includes(part) ? [...accum, part] : accum),
    []
  );
  if (operatorsMatched.length > 1) {
    return ` ${operatorsMatched[operatorsMatched.length - 1].trim()} `;
  } else {
    return '';
  }
};

export const removeKqlVariables = (kqlQuery: string): string => {
  const value: RisonValue = decodeRison(kqlQuery);
  if (isRisonObject(value)) {
    const filterQuery = value.filterQuery;
    if (isRisonObject(filterQuery)) {
      if (isRegularString(filterQuery.expression)) {
        filterQuery.expression = removeKqlVariablesUsingRegex(filterQuery.expression);
        return encode(value);
      }
    }
  }
  return kqlQuery;
};
