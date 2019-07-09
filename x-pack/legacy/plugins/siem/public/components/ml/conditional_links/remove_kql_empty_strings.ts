/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RisonValue, encode } from 'rison-node';
import { decodeRison, isRisonObject, isRegularString } from './rison_helpers';

export const removeKqlEmptyStringsUsingRegex = (expression: string) => {
  const myRegexp = /([\w\.\-\(\)\[\]]+)\s*:\s*""/g;
  return expression.replace(myRegexp, '');
};

export const removeKqlEmptyStrings = (kqlQuery: string): string => {
  const value: RisonValue = decodeRison(kqlQuery);
  if (isRisonObject(value)) {
    const filterQuery = value.filterQuery;
    if (isRisonObject(filterQuery)) {
      if (isRegularString(filterQuery.expression)) {
        filterQuery.expression = removeKqlEmptyStringsUsingRegex(filterQuery.expression);
        return encode(value);
      }
    }
  }
  return kqlQuery;
};
