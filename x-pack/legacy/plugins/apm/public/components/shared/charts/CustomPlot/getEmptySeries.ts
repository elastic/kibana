/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import d3 from 'd3';

export const getEmptySeries = (
  start = Date.now() - 3600000,
  end = Date.now()
) => {
  const dates = d3.time
    .scale()
    .domain([new Date(start), new Date(end)])
    .ticks();

  return [
    {
      title: '',
      type: 'line',
      legendValue: '',
      color: '',
      data: dates.map(x => ({
        x: x.getTime(),
        y: null
      }))
    }
  ];
};
