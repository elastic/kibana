/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, sortBy } from 'lodash';
import { PointSeriesColumns, DatatableRow, Ticks } from '../../../../types';

export const getTickHash = (columns: PointSeriesColumns, rows: DatatableRow[]) => {
  const ticks: Ticks = {
    x: {
      hash: {},
      counter: 0,
    },
    y: {
      hash: {},
      counter: 0,
    },
  };

  if (get(columns, 'x.type') === 'string') {
    sortBy(rows, ['x']).forEach(row => {
      if (!ticks.x.hash[row.x]) {
        ticks.x.hash[row.x] = ticks.x.counter++;
      }
    });
  }

  if (get(columns, 'y.type') === 'string') {
    sortBy(rows, ['y'])
      .reverse()
      .forEach(row => {
        if (!ticks.y.hash[row.y]) {
          ticks.y.hash[row.y] = ticks.y.counter++;
        }
      });
  }

  return ticks;
};
