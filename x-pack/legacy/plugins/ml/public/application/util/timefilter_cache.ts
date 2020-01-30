/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TimefilterSetup } from 'src/plugins/data/public';

let timefilterCache: TimefilterSetup | null = null;

export function cacheTimefilter(tf: TimefilterSetup) {
  timefilterCache = tf;
  return Promise.resolve();
}
export function getTimefilter() {
  if (timefilterCache === null) {
    throw new Error();
  }
  return timefilterCache.timefilter;
}
