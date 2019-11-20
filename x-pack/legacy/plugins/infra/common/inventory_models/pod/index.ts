/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { metrics } from './metrics';
import { InventoryModel } from '../types';
import { nginx as nginxRequiredMetrics } from '../shared/metrics/required_metrics';

export const pod: InventoryModel = {
  id: 'pod',
  requiredModules: ['kubernetes'],
  metrics,
  requiredMetrics: [
    'podOverview',
    'podCpuUsage',
    'podMemoryUsage',
    'podNetworkTraffic',
    ...nginxRequiredMetrics,
  ],
};
