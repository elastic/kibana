/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { metrics } from './metrics';
import { InventoryModel } from '../types';

export const awsSQS: InventoryModel = {
  id: 'awsSQS',
  displayName: i18n.translate('xpack.infra.inventoryModels.awsSQS.displayName', {
    defaultMessage: 'SQS Queues',
  }),
  requiredModules: ['aws'],
  crosslinkSupport: {
    details: true,
    logs: true,
    apm: false,
    uptime: false,
  },
  metrics,
  fields: {
    id: 'aws.sqs.queue.name',
    name: 'aws.sqs.queue.name',
  },
  requiredMetrics: [
    'awsSQSMessagesVisible',
    'awsSQSMessagesDelayed',
    'awsSQSMessagesSent',
    'awsSQSMessagesEmpty',
    'awsSQSOldestMessage',
  ],
};
