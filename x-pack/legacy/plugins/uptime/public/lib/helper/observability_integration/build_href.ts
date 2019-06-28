/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { LatestMonitor } from '../../../../common/graphql/types';

/**
 * Builds URLs to the designated features by extracting values from the provided
 * monitor object on a given path. Then returns the result of a provided function
 * to place the value in its rightful place on the URI string.
 * @param monitor the data object
 * @param path the location on the object of the desired data
 * @param getHref a function that returns the full URL
 */
export const buildHref = (
  monitor: LatestMonitor,
  path: string,
  getHref: (value: string) => string
): string | undefined => {
  const queryValue = get<string | undefined>(monitor, path);
  if (queryValue === undefined) {
    return undefined;
  }
  return getHref(queryValue);
};
