/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElementFactory } from '../../../types';

export const horizontalBarChart: ElementFactory = () => ({
  name: 'horizontalBarChart',
  displayName: 'Bar horizontal',
  type: 'chart',
  help: 'A customizable horizontal bar chart',
  icon: 'visBarHorizontal',
  expression: `filters
| demodata
| pointseries x="size(cost)" y="project" color="project"
| plot defaultStyle={seriesStyle bars=0.75 horizontalBars=true} legend=false
| render`,
});
