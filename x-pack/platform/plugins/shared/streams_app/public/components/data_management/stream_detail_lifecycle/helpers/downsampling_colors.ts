/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Replace with colors from the palette when available https://github.com/elastic/kibana/issues/249185
const DOWNSAMPLING_COLORS = [
  '#E2D3FE',
  '#D1BAFC',
  '#C5A5FA',
  '#B386F9',
  '#A36DEF',
  '#925CDA',
  '#8144CC',
  '#6B3C9F',
  '#52357E',
  '#3E2C63',
  '#322452',
];

export const getDownsamplingColor = (index: number) => DOWNSAMPLING_COLORS[index];
