/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import header from './header.png';

import { ElementFactory } from '../types';
export const pie: ElementFactory = () => ({
  name: 'pie',
  displayName: 'Pie chart',
  tags: ['chart', 'proportion'],
  width: 300,
  height: 300,
  help: 'A simple pie chart',
  image: header,
  expression: `filters
| demodata
| pointseries color="state" size="max(price)"
| pie
| render`,
});
