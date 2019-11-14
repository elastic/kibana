/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MonitorGroups, MonitorGroupIterator } from './search';

export const getSnapshotCountHelper = async (iterator: MonitorGroupIterator) => {
  const items: MonitorGroups[] = [];
  let res: MonitorGroups | null;
  // query the index to find the most recent check group for each monitor/location
  do {
    res = await iterator.next();
    if (res) {
      items.push(res);
    }
  } while (res !== null);
  return (
    items
      // result is a list of 'up' | 'down', 1:1 per monitor
      .map(({ groups }) =>
        // for each location, infer a status
        groups.reduce<'up' | 'down'>((acc, cur) => {
          if (acc === 'down') {
            return acc;
          }
          return cur.status === 'down' ? 'down' : 'up';
        }, 'up')
      )
      // count each status up into a single object
      .reduce(
        (acc, cur) => {
          if (cur === 'up') {
            acc.up++;
          } else {
            acc.down++;
          }
          acc.total++;
          return acc;
        },
        { up: 0, down: 0, mixed: 0, total: 0 }
      )
  );
};
