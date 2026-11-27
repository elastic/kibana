/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExecutionStorageSource } from './repositories/data_access_layer';

/**
 * Selects the execution storage backend (`plain_index` or `data_stream`).
 *
 * `workflowsExecutionEngine.storage.source` in kibana.yml is the fallback when
 * the flag provider has no value. Later flag changes switch the live data client.
 */
export const WORKFLOWS_EXECUTION_STORAGE_SOURCE_FLAG = 'workflowsExecutionEngine.storage.source';

export const isExecutionStorageSource = (value: string): value is ExecutionStorageSource =>
  value === 'plain_index' || value === 'data_stream';
