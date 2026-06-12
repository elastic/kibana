/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Legend } from '../../types';
const acceptedPositions: Legend[] = [
  Legend.NORTH_WEST,
  Legend.SOUTH_WEST,
  Legend.NORTH_EAST,
  Legend.SOUTH_EAST,
];

export const getLegendConfig = (legend: boolean | Legend, size: number) => {
  if (!legend || size < 2) {
    return { show: false };
  }

  const config = {
    show: true,
    backgroundOpacity: 0,
    labelBoxBorderColor: 'transparent',
  };

  // @ts-expect-error
  config.position = !legend || acceptedPositions.includes(legend) ? legend : 'ne';

  return config;
};
