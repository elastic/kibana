/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { metrics } from './metrics';
import { InventoryModel } from '../types';

export const awsRDS: InventoryModel = {
  id: 'awsRDS',
  displayName: 'RDS',
  requiredModules: ['aws'],
  metrics,
  fields: {
    id: 'aws.rds.db_instance.arn',
    name: 'aws.rds.db_instance.identifier',
  },
  requiredMetrics: [
    'awsRDSCpuTotal',
    'awsRDSConnections',
    'awsRDSQueriesExecuted',
    'awsRDSActiveTransactions',
    'awsRDSLatency',
  ],
};
