/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { random, sample } from 'lodash';
import type { GeneratorFunction } from '../../types';
export { indexTemplate } from './ecs';

const createGroupIndex = (index: number) => Math.floor(index / 1000) * 1000;

const DATABASE_ERROR_MESSAGES = [
  'Connection timeout: database error occurred while connecting to primary server',
  'Query failed: database error in SELECT statement execution',
  'Transaction rollback: database error detected, rolling back changes',
  'Deadlock detected: database error in concurrent transaction processing',
  'Connection pool exhausted: database error - no available connections',
  'Constraint violation: database error in data integrity check',
  'Replication lag: database error in master-slave synchronization',
  'Index corruption: database error detected in table indexes',
  'Lock timeout: database error waiting for resource lock',
  'Authentication failed: database error in user credential verification',
];

const SUCCESS_MESSAGES = [
  'Database connection established successfully',
  'Query executed successfully: SELECT * FROM users WHERE active = true',
  'Transaction committed successfully',
  'Data backup completed successfully',
  'Index optimization completed successfully',
  'Replication sync completed successfully',
  'Database health check passed',
  'Connection pool initialized successfully',
  'User authentication successful',
  'Cache refresh completed successfully',
];

const DATABASE_HOSTS = [
  'db-primary-01',
  'db-primary-02',
  'db-replica-01',
  'db-replica-02',
  'db-analytics-01',
  'db-cache-01',
  'db-warehouse-01',
];

export const generateEvent: GeneratorFunction = (config, schedule, index, timestamp) => {
  const groupIndex = createGroupIndex(index);
  const latency = random(50, 2000);
  const interval = schedule.interval ?? config.indexing.interval;
  const isError = schedule.template === 'error' || schedule.template === 'bad';
  const hostName = sample(DATABASE_HOSTS) || 'db-primary-01';

  return [
    {
      namespace: 'database_logs',
      '@timestamp': timestamp.toISOString(),
      event: {
        module: 'database',
        dataset: 'database.logs',
        duration: latency,
        code: isError ? random(400, 599) : 200,
        category: isError ? 'database_error' : 'database_success',
        type: isError ? 'error' : 'info',
      },
      log: {
        level: isError ? 'error' : 'info',
        logger: 'database_logs',
      },
      host: {
        name: hostName,
      },
      service: {
        name: 'database-service',
        type: 'database',
      },
      labels: {
        groupId: `group-${groupIndex}`,
        eventId: `event-${index}`,
        scenario: schedule.template,
        database_type: sample(['postgresql', 'mysql', 'mongodb', 'elasticsearch']) || 'postgresql',
      },
      metricset: {
        period: interval,
      },
      message: isError
        ? sample(DATABASE_ERROR_MESSAGES) || 'Unknown database error occurred'
        : sample(SUCCESS_MESSAGES) || 'Database operation completed successfully',
      database: {
        query_time: latency,
        connection_id: `conn_${random(1000, 9999)}`,
        query_type: sample(['SELECT', 'INSERT', 'UPDATE', 'DELETE']) || 'SELECT',
      },
    },
  ];
};
