/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * A reduce that takes statuses from different products in a cluster and boil
 * it down into a single status
 */
export function calculateOverallStatus(set: Array<string | null | undefined>) {
  return set.reduce((result, current) => {
    if (!current) {
      return result;
    }
    if (current === 'red') {
      return current;
    } // change to red
    if (result !== 'green') {
      return result;
    } // preserve non-green
    return current; // change to green or yellow
  });
}
