/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElementFactory } from '../../../types';
import header from './header.png';

export const lineChart: ElementFactory = () => ({
  name: 'lineChart',
  displayName: 'Line chart',
  tags: ['chart'],
  help: 'A customizable line chart',
  image: header,
  expression: `filters
| demodata
| pointseries x="time" y="mean(price)"
| plot defaultStyle={seriesStyle lines=3}
| render`,
});
