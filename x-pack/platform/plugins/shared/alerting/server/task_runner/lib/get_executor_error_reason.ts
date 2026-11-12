/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { errors } from '@elastic/elasticsearch';
import { RuleExecutionStatusErrorReasons } from '../../types';

/** Elasticsearch exception types that mean the cluster could not take the work, whatever the HTTP status. */
const UNAVAILABLE_ES_ERROR_TYPES: ReadonlySet<string> = new Set([
  'cluster_block_exception',
  'circuit_breaking_exception',
  'es_rejected_execution_exception',
  'no_shard_available_action_exception',
  'master_not_discovered_exception',
  'node_not_connected_exception',
  'node_disconnected_exception',
  'unavailable_shards_exception',
]);

const UNAVAILABLE_STATUS_CODES: ReadonlySet<number> = new Set([429, 502, 503, 504]);

interface ErrorLike {
  statusCode?: unknown;
  status?: unknown;
  meta?: { body?: { error?: { type?: unknown } } };
  errBody?: { error?: { type?: unknown } };
}

const getStatusCode = (error: Error): number | undefined => {
  if (Boom.isBoom(error)) {
    return error.output.statusCode;
  }
  const { statusCode, status } = error as ErrorLike;
  if (typeof statusCode === 'number') {
    return statusCode;
  }
  if (typeof status === 'number') {
    return status;
  }
  return undefined;
};

const getEsErrorType = (error: Error): string | undefined => {
  const { meta, errBody } = error as ErrorLike;
  const type = meta?.body?.error?.type ?? errBody?.error?.type;
  return typeof type === 'string' ? type : undefined;
};

/**
 * Maps an error thrown by a rule type executor to the most specific execution status reason,
 * falling back to `Execute` for anything that is not a recognisable infrastructure failure.
 */
export const getExecutorErrorReason = (error: Error): RuleExecutionStatusErrorReasons => {
  if (error instanceof errors.ConnectionError || error instanceof errors.TimeoutError) {
    return RuleExecutionStatusErrorReasons.Unavailable;
  }

  const esErrorType = getEsErrorType(error);
  if (esErrorType && UNAVAILABLE_ES_ERROR_TYPES.has(esErrorType)) {
    return RuleExecutionStatusErrorReasons.Unavailable;
  }
  if (esErrorType === 'index_not_found_exception') {
    return RuleExecutionStatusErrorReasons.NotFound;
  }

  const statusCode = getStatusCode(error);
  if (statusCode === 401) {
    return RuleExecutionStatusErrorReasons.Unauthorized;
  }
  if (statusCode === 403) {
    return RuleExecutionStatusErrorReasons.Forbidden;
  }
  if (statusCode === 404) {
    return RuleExecutionStatusErrorReasons.NotFound;
  }
  if (statusCode !== undefined && UNAVAILABLE_STATUS_CODES.has(statusCode)) {
    return RuleExecutionStatusErrorReasons.Unavailable;
  }

  return RuleExecutionStatusErrorReasons.Execute;
};
