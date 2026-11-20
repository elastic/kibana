/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  WORKFLOWS_EXECUTIONS_INDEX,
  WORKFLOWS_STEP_EXECUTIONS_INDEX,
} from '../../constants/execution_indexes';

export const WORKFLOWS_EXECUTIONS_IO_DATA_STREAM = '.workflows-executions-io-data-stream';

/**
 * Bump when Elasticsearch index mappings for the executions IO data stream change.
 * Compared on startup against `mappings._meta.managed_index_mappings_version` on backing indices.
 */
export const WORKFLOWS_EXECUTIONS_IO_MANAGED_INDEX_MAPPINGS_VERSION = 1;

/** Plain indexes that may still hold `input` / `output` on the execution document. */
export const EXECUTION_IO_FALLBACK_INDEXES = [
  WORKFLOWS_EXECUTIONS_INDEX,
  WORKFLOWS_STEP_EXECUTIONS_INDEX,
] as const;
