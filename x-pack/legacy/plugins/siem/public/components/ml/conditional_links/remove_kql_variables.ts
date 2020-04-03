/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RisonValue, encode } from 'rison-node';
import { decodeRison, isRisonObject, isRegularString } from './rison_helpers';

export const operators = ['and', 'or', 'not'];

export const removeKqlVariablesUsingRegex = (expression: string) => {
  const myRegexp = /(\s+)*(and|or|not){0,1}(\s+)*([\w.\-[\]]+)\s*:\s*"(\$[\w.\-()[\]]+\$)"(\s+)*(and|or|not){0,1}(\s+)*/g;
  return expression.replace(myRegexp, replacer);
};

export const replacer = (match: string, ...parts: Array<string | null | undefined>): string => {
  // this function is only called after applying the match..
  // see here for more details -> https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_function_as_a_parameter
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
    const appQuery = value;
    if (isRisonObject(appQuery)) {
      if (isRegularString(appQuery.query)) {
        appQuery.query = removeKqlVariablesUsingRegex(appQuery.query);
        return encode(value);
      }
    }
  }
  return kqlQuery;
};
