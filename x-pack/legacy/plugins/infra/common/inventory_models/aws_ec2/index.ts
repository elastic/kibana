/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { metrics } from './metrics';
import { InventoryModel } from '../types';

export const awsEC2: InventoryModel = {
  id: 'awsEC2',
  displayName: i18n.translate('xpack.infra.inventoryModels.awsEC2.displayName', {
    defaultMessage: 'EC2 Instances',
  }),
  requiredDataset: 'aws',
  crosslinkSupport: {
    details: true,
    logs: true,
    apm: true,
    uptime: true,
  },
  metrics,
  fields: {
    id: 'cloud.instance.id',
    name: 'cloud.instance.name',
    ip: 'aws.ec2.instance.public.ip',
  },
  requiredMetrics: ['awsEC2CpuUtilization', 'awsEC2NetworkTraffic', 'awsEC2DiskIOBytes'],
};
