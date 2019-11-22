/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { metrics } from './metrics';
import { InventoryModel } from '../types';

export const awsSQS: InventoryModel = {
  id: 'awsSQS',
  displayName: 'SQS',
  requiredModules: ['aws'],
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
