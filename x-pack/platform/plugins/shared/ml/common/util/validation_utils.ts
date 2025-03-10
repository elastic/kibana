/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { VALIDATION_STATUS } from '@kbn/ml-validators';

// get the most severe status level from a list of messages
const contains = (arr: string[], str: string) => arr.indexOf(str) >= 0;

export function getMostSevereMessageStatus(messages: Array<{ status: string }>): VALIDATION_STATUS {
  const statuses = messages.map((m) => m.status);
  return [VALIDATION_STATUS.INFO, VALIDATION_STATUS.WARNING, VALIDATION_STATUS.ERROR].reduce(
    (previous, current) => {
      return contains(statuses, current) ? current : previous;
    },
    VALIDATION_STATUS.SUCCESS
  );
}

export function isValidJson(json: string) {
  if (json === null) {
    return false;
  }

  try {
    JSON.parse(json);
    return true;
  } catch (error) {
    return false;
  }
}

export function findAggField(
  aggs: Record<string, any> | { [key: string]: any },
  fieldName: string | undefined,
  returnParent: boolean = false
): any {
  if (fieldName === undefined) return;
  let value;
  Object.keys(aggs).some(function (k) {
    if (k === fieldName) {
      value = returnParent === true ? aggs : aggs[k];
      return true;
    }
    if (Object.hasOwn(aggs, k) && aggs[k] !== null && typeof aggs[k] === 'object') {
      value = findAggField(aggs[k], fieldName, returnParent);
      return value !== undefined;
    }
  });
  return value;
}

export function isValidAggregationField(aggs: Record<string, any>, fieldName: string): boolean {
  return findAggField(aggs, fieldName) !== undefined;
}
