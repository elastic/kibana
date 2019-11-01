/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { metrics } from './metrics';
import { InventoryModel } from '../types';

export const awsEC2: InventoryModel = {
  id: 'awsEC2',
  requiredModules: ['aws'],
  metrics,
  fields: {
    id: 'cloud.instance.id',
    name: 'cloud.instance.name',
    ip: 'aws.ec2.instance.public.ip',
  },
  requiredMetrics: [
    'hostSystemOverview',
    'hostCpuUsage',
    'hostLoad',
    'hostMemoryUsage',
    'hostNetworkTraffic',
    'hostK8sOverview',
    'hostK8sCpuCap',
    'hostK8sMemoryCap',
    'hostK8sDiskCap',
    'hostK8sPodCap',
  ],
};
