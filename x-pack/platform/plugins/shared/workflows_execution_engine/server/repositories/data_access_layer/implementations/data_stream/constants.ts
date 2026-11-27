/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Bump when Elasticsearch index mappings for the workflows executions data stream change.
 */
export const WORKFLOWS_EXECUTIONS_MANAGED_INDEX_MAPPINGS_VERSION = 1;
export const WORKFLOWS_EXECUTIONS_DATA_STREAM = '.workflows-executions-data-stream';

/**
 * Backing indexes read with mget before falling back to search. The window is the write
 * index plus the one a document just rolled out of. A search cannot see an unrefreshed write.
 */
export const REALTIME_BACKING_INDEX_WINDOW = 2;

/**
 * Bump when Elasticsearch index mappings for the workflows step executions data stream change.
 */
export const WORKFLOWS_STEP_EXECUTIONS_MANAGED_INDEX_MAPPINGS_VERSION = 1;
export const WORKFLOWS_STEP_EXECUTIONS_DATA_STREAM = '.workflows-step-executions-data-stream';
