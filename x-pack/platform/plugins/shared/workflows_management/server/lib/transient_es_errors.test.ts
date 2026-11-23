/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiagnosticResult, TransportResult } from '@elastic/elasticsearch';
import { errors } from '@elastic/elasticsearch';
import { isTransientEsError, WorkflowShardUnavailableError } from './transient_es_errors';

const responseError = (statusCode: number, type: string) =>
  new errors.ResponseError({
    statusCode,
    headers: {},
    warnings: [],
    meta: {} as TransportResult['meta'],
    body: { error: { type, reason: type } },
  } as TransportResult);

describe('isTransientEsError', () => {
  it.each([
    ['no living connections', new errors.NoLivingConnectionsError('', {} as DiagnosticResult)],
    ['a connection error', new errors.ConnectionError('socket hang up')],
    ['a timeout', new errors.TimeoutError('Request timed out')],
    ['a 503 response', responseError(503, 'search_phase_execution_exception')],
    ['a 429 response', responseError(429, 'es_rejected_execution_exception')],
    [
      'an unavailable shard with another status',
      responseError(500, 'no_shard_available_action_exception'),
    ],
    ['a workflow shard that is not available', new WorkflowShardUnavailableError('not ready')],
  ])('returns true for %s', (_, error) => {
    expect(isTransientEsError(error)).toBe(true);
  });

  it.each([
    ['a version conflict', responseError(409, 'version_conflict_engine_exception')],
    ['a bad request', responseError(400, 'mapper_parsing_exception')],
    ['a missing index', responseError(404, 'index_not_found_exception')],
    ['an error that is not from Elasticsearch', new Error('Managed workflow is dynamic')],
    ['a value that is not an error', 'There are no living connections'],
  ])('returns false for %s', (_, error) => {
    expect(isTransientEsError(error)).toBe(false);
  });
});
