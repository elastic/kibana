/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { metrics } from './metrics';
import { InventoryModel } from '../types';
import { nginx as nginxRequiredMetrics } from '../shared/metrics/required_metrics';

export const pod: InventoryModel = {
  id: 'pod',
  displayName: i18n.translate('xpack.infra.inventoryModel.displayName.kubernetes', {
    defaultMessage: 'pod',
  }),
  requiredModules: ['kubernetes'],
  fields: {
    id: 'kubernetes.pod.uid',
    name: 'kubernetes.pod.name',
    ip: 'kubernetes.pod.ip',
  },
  metrics,
  requiredMetrics: [
    'podOverview',
    'podCpuUsage',
    'podMemoryUsage',
    'podNetworkTraffic',
    ...nginxRequiredMetrics,
  ],
};
