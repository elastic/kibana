/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export const TASK_MANAGER_INDEX = '.kibana_task_manager';
export const CONCURRENCY_ALLOW_LIST_BY_TASK_TYPE: string[] = [
  // for testing
  'sampleTaskWithSingleConcurrency',
  'sampleTaskWithLimitedConcurrency',
  'timedTaskWithSingleConcurrency',
  'timedTaskWithLimitedConcurrency',
  'sampleTaskSharedConcurrencyType1',
  'sampleTaskSharedConcurrencyType2',

  // task types requiring a concurrency
  'report:execute',
  'report:execute-scheduled',
];
