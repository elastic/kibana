/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElementFactory } from '../../../types';

export const plot: ElementFactory = () => ({
  name: 'plot',
  displayName: 'Coordinate plot',
  type: 'chart',
  help: 'Mixed line, bar or dot charts',
  expression: `filters
| demodata
| pointseries x="time" y="sum(price)" color="state"
| plot defaultStyle={seriesStyle points=5}
| render`,
});
