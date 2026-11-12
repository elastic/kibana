/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { errors } from '@elastic/elasticsearch';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { RuleExecutionStatusErrorReasons } from '../../types';
import { getExecutorErrorReason } from './get_executor_error_reason';

const responseError = (statusCode: number, type?: string) =>
  new errors.ResponseError({
    statusCode,
    body: type ? { error: { type, reason: `${type} happened` } } : undefined,
    headers: {},
    warnings: null,
    meta: {} as never,
  });

/** Mirrors the data plugin's `KbnSearchError`, which search-source based rule types throw. */
const searchError = (statusCode: number, type?: string) =>
  Object.assign(new Error('search failed'), {
    statusCode,
    errBody: type ? { error: { type } } : undefined,
  });

describe('getExecutorErrorReason', () => {
  it('maps 401 responses to Unauthorized', () => {
    expect(getExecutorErrorReason(responseError(401, 'security_exception'))).toBe(
      RuleExecutionStatusErrorReasons.Unauthorized
    );
    expect(getExecutorErrorReason(searchError(401, 'security_exception'))).toBe(
      RuleExecutionStatusErrorReasons.Unauthorized
    );
  });

  it('maps 403 responses to Forbidden', () => {
    expect(getExecutorErrorReason(responseError(403, 'security_exception'))).toBe(
      RuleExecutionStatusErrorReasons.Forbidden
    );
  });

  it('maps missing indices and saved objects to NotFound', () => {
    expect(getExecutorErrorReason(responseError(404, 'index_not_found_exception'))).toBe(
      RuleExecutionStatusErrorReasons.NotFound
    );
    expect(getExecutorErrorReason(searchError(404, 'index_not_found_exception'))).toBe(
      RuleExecutionStatusErrorReasons.NotFound
    );
    expect(
      getExecutorErrorReason(
        SavedObjectsErrorHelpers.createGenericNotFoundError('index-pattern', 'abc')
      )
    ).toBe(RuleExecutionStatusErrorReasons.NotFound);
    expect(getExecutorErrorReason(Boom.notFound('nope'))).toBe(
      RuleExecutionStatusErrorReasons.NotFound
    );
  });

  it('maps connectivity and capacity problems to Unavailable', () => {
    expect(getExecutorErrorReason(new errors.ConnectionError('ECONNREFUSED', {} as never))).toBe(
      RuleExecutionStatusErrorReasons.Unavailable
    );
    expect(getExecutorErrorReason(new errors.TimeoutError('timed out', {} as never))).toBe(
      RuleExecutionStatusErrorReasons.Unavailable
    );
    expect(getExecutorErrorReason(responseError(503, 'master_not_discovered_exception'))).toBe(
      RuleExecutionStatusErrorReasons.Unavailable
    );
    expect(getExecutorErrorReason(responseError(429, 'circuit_breaking_exception'))).toBe(
      RuleExecutionStatusErrorReasons.Unavailable
    );
    expect(getExecutorErrorReason(responseError(403, 'cluster_block_exception'))).toBe(
      RuleExecutionStatusErrorReasons.Unavailable
    );
    expect(getExecutorErrorReason(searchError(502))).toBe(
      RuleExecutionStatusErrorReasons.Unavailable
    );
  });

  it('falls back to Execute for query errors and plain errors', () => {
    expect(getExecutorErrorReason(responseError(400, 'parsing_exception'))).toBe(
      RuleExecutionStatusErrorReasons.Execute
    );
    expect(getExecutorErrorReason(responseError(500, 'search_phase_execution_exception'))).toBe(
      RuleExecutionStatusErrorReasons.Execute
    );
    expect(getExecutorErrorReason(searchError(500))).toBe(RuleExecutionStatusErrorReasons.Execute);
    expect(getExecutorErrorReason(new Error('boom'))).toBe(RuleExecutionStatusErrorReasons.Execute);
  });
});
