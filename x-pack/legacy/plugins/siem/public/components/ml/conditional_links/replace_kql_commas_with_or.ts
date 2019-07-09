/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RisonValue, encode } from 'rison-node';
import { decodeRison, isRisonObject, isRegularString } from './rison_helpers';

export const replacement = (match: string, p1: string, p2: string) => {
  const split = p2.split(',');
  const newQuery = split.reduce((accum, item, index) => {
    if (index === 0) {
      return `${p1}: ${item}`;
    } else {
      return `${accum} or ${p1}: ${item}`;
    }
  }, '');
  return `(${newQuery})`;
};

// TODO: Add tests like this one
// const expression = 'process.name: "something,yolo" AND user.name : "root,systemd-timesync"';
export const replaceKqlCommasWithOrUsingRegex = (expression: string) => {
  const myRegexp = /([\w\.\-\(\)\[\]]+)\s*:\s*"([\w\.\-\(\)\[\]]+,[\w\.\-\(\)\[\]]+)"/g;
  return expression.replace(myRegexp, replacement);
};

export const replaceKqlCommasWithOr = (kqlQuery: string): string => {
  const value: RisonValue = decodeRison(kqlQuery);
  if (isRisonObject(value)) {
    const filterQuery = value.filterQuery;
    if (isRisonObject(filterQuery)) {
      if (isRegularString(filterQuery.expression)) {
        filterQuery.expression = replaceKqlCommasWithOrUsingRegex(filterQuery.expression);
        return encode(value);
      }
    }
  }
  return kqlQuery;
};
