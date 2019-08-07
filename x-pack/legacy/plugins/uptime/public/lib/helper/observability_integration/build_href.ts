/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { Check } from '../../../../common/graphql/types';

/**
 * Builds URLs to the designated features by extracting values from the provided
 * monitor object on a given path. Then returns the result of a provided function
 * to place the value in its rightful place on the URI string.
 * @param checks array of summary checks containing the data to extract
 * @param path the location on the object of the desired data
 * @param getHref a function that returns the full URL
 */
export const buildHref = (
  checks: Check[],
  path: string,
  getHref: (value: string | string[] | undefined) => string | undefined
): string | undefined => {
  const queryValue = checks
    .map(check => get<string | undefined>(check, path, undefined))
    .filter((value: string | undefined) => value !== undefined);
  if (queryValue.length === 0) {
    return getHref(undefined);
  }
  // @ts-ignore the values will all be defined
  return queryValue.length === 1 ? getHref(queryValue[0]) : getHref(queryValue);
};
