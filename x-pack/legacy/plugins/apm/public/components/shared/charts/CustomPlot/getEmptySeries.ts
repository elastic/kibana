/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { memoize } from 'lodash';
import d3 from 'd3';

export const getEmptySeries = memoize(
  (
    start: number | string = Date.now() - 3600000,
    end: number | string = Date.now()
  ) => {
    const dates = d3.time
      .scale()
      .domain([new Date(start), new Date(end)])
      .ticks();

    return [
      {
        data: dates.map(x => ({
          x: x.getTime(),
          y: 1
        }))
      }
    ];
  },
  (start: string, end: string) => [start, end].join('_')
);
