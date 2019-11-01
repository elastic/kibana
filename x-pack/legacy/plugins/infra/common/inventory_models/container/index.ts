/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { metrics } from './metrics';
import { InventoryModel } from '../types';

export const container: InventoryModel = {
  id: 'container',
  requiredModules: ['docker'],
  fields: {
    id: 'container.id',
    name: 'container.name',
    ip: 'continaer.ip_address',
  },
  metrics,
  requiredMetrics: [
    'containerOverview',
    'containerCpuUsage',
    'containerMemory',
    'containerNetworkTraffic',
    'containerDiskIOBytes',
    'containerDiskIOOps',
  ],
};
