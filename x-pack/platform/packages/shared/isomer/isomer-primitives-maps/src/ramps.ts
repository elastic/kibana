/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MapRamp } from './types';

/**
 * Kibana Maps' sequential ramps under Borealis, as `euiPaletteCool(8)` and its siblings return them; Maps
 * interpolates a value between the data's minimum and maximum across these eight stops.
 */
export const MAP_RAMP_COLORS: Record<MapRamp, readonly string[]> = {
  blues: ['#e0ecff', '#cfe1ff', '#bed7ff', '#adccff', '#9bc2ff', '#89b7ff', '#76adff', '#61a2ff'],
  greens: ['#e1f3ee', '#cbece1', '#b5e6d3', '#9fdfc6', '#87d8b9', '#6dd1ac', '#50c99f', '#24c292'],
  greys: ['#d5dce8', '#b6c0d3', '#98a5bc', '#7b8aa4', '#61718b', '#485872', '#324058', '#1d2a3e'],
  reds: ['#fae9e9', '#fcd8d6', '#fec8c3', '#feb7b0', '#fda69e', '#fc968d', '#f9847b', '#f6726a'],
  yellow_to_red: [
    '#ffe4e0',
    '#ffd5cf',
    '#ffc5be',
    '#ffb5ac',
    '#fea49b',
    '#fc948b',
    '#f9837a',
    '#f6726a',
  ],
  green_to_red: [
    '#24c292',
    '#69d5b2',
    '#aee8d2',
    '#d5e0ab',
    '#fed1a3',
    '#ffc9c2',
    '#fb9e96',
    '#f6726a',
  ],
  blue_to_red: [
    '#61a2ff',
    '#9ac2ff',
    '#cfe1ff',
    '#f2f7fe',
    '#fdf5f4',
    '#ffd4cf',
    '#fda49c',
    '#f6726a',
  ],
};

/** The ramp's stop for `value` between `min` and `max`. */
export const rampColor = (ramp: MapRamp, value: number, min: number, max: number): string => {
  const colors = MAP_RAMP_COLORS[ramp];
  const at = max > min ? (value - min) / (max - min) : 1;
  return colors[Math.min(colors.length - 1, Math.max(0, Math.floor(at * colors.length)))]!;
};
