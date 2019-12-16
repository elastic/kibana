/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * A reduce that takes statuses from different products in a cluster and boil
 * it down into a single status
 */
export function calculateOverallStatus(set) {
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
