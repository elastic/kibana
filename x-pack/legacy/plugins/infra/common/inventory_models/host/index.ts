/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { metrics } from './metrics';
import { InventoryModel } from '../types';
import {
  aws as awsRequiredMetrics,
  nginx as nginxRequireMetrics,
} from '../shared/metrics/required_metrics';

export const host: InventoryModel = {
  id: 'host',
  displayName: i18n.translate('xpack.infra.inventoryModel.host.displayName', {
    defaultMessage: 'Hosts',
  }),
  requiredModule: 'system',
  crosslinkSupport: {
    details: true,
    logs: true,
    apm: true,
    uptime: true,
  },
  fields: {
    id: 'host.name',
    name: 'host.name',
    ip: 'host.ip',
  },
  metrics,
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
    ...awsRequiredMetrics,
    ...nginxRequireMetrics,
  ],
};
