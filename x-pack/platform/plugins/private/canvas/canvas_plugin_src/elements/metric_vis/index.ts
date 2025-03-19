/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElementFactory } from '../../../types';

export const metricVis: ElementFactory = () => ({
  name: 'metricVis',
  displayName: 'Metric Vis',
  type: 'chart',
  help: 'Metric visualization',
  icon: 'visMetric',
  expression: `kibana
  | selectFilter
  | demodata
  | head 1
  | metricVis metric="cost"`,
});
