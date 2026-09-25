/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { loggerMock } from '@kbn/logging-mocks';
import { errorResult, unavailableResult, SEARCH_PHASE, toFailureResult } from './results';

// ---------------------------------------------------------------------------
// errorResult / unavailableResult
// ---------------------------------------------------------------------------

describe('errorResult', () => {
  it('returns status error with the given reason', () => {
    expect(errorResult('timeout')).toEqual({ status: 'error', reason: 'timeout' });
    expect(errorResult('scope_too_large')).toEqual({ status: 'error', reason: 'scope_too_large' });
  });
});

describe('unavailableResult', () => {
  it('returns status unavailable with the given reason', () => {
    expect(unavailableResult('missing_fields')).toEqual({
      status: 'unavailable',
      reason: 'missing_fields',
    });
    expect(unavailableResult('inference_unavailable')).toEqual({
      status: 'unavailable',
      reason: 'inference_unavailable',
    });
  });
});

// ---------------------------------------------------------------------------
// toFailureResult — cancellation
// ---------------------------------------------------------------------------

describe('toFailureResult — cancellation', () => {
  it('classifies a RequestAbortedError as cancelled (logged at debug)', () => {
    const logger = loggerMock.create();
    const abort = new errors.RequestAbortedError('aborted');
    const result = toFailureResult(abort, { logger, target: 'logs-*', phase: SEARCH_PHASE.PROBE });
    expect(result).toMatchObject({ status: 'error', reason: 'cancelled' });
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('cancelled'));
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('classifies a plain Error with name AbortError as cancelled', () => {
    const logger = loggerMock.create();
    const abort = Object.assign(new Error('abort'), { name: 'AbortError' });
    const result = toFailureResult(abort, {
      logger,
      target: 'logs-*',
      phase: SEARCH_PHASE.SEARCH,
    });
    expect(result).toMatchObject({ status: 'error', reason: 'cancelled' });
    expect(logger.debug).toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// toFailureResult — timeout, phase-dependent reason
// ---------------------------------------------------------------------------

describe('toFailureResult — timeout', () => {
  it('classifies a real TimeoutError as scope_too_large in the probe phase', () => {
    const logger = loggerMock.create();
    const timeout = new errors.TimeoutError('timed out', {} as any);
    const result = toFailureResult(timeout, {
      logger,
      target: 'logs-*',
      phase: SEARCH_PHASE.PROBE,
    });
    expect(result).toMatchObject({ status: 'error', reason: 'scope_too_large' });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('scope too large'));
  });

  it('classifies a real TimeoutError as timeout in the search phase', () => {
    const logger = loggerMock.create();
    const timeout = new errors.TimeoutError('timed out', {} as any);
    const result = toFailureResult(timeout, {
      logger,
      target: 'logs-*',
      phase: SEARCH_PHASE.SEARCH,
    });
    expect(result).toMatchObject({ status: 'error', reason: 'timeout' });
  });

  it('classifies a real TimeoutError as inference_not_ready in the rerank phase', () => {
    // A cold rerank model can spend longer loading than the whole query budget. Reporting that as
    // `timeout` told callers to narrow the scope, which never helps — the scope is not the cause.
    const logger = loggerMock.create();
    const timeout = new errors.TimeoutError('timed out', {} as any);
    const result = toFailureResult(timeout, {
      logger,
      target: 'logs-*',
      phase: SEARCH_PHASE.RERANK,
    });
    expect(result).toMatchObject({ status: 'error', reason: 'inference_not_ready' });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('still be loading its model'));
  });

  it('classifies a non-timeout rerank failure as execution, not inference_not_ready', () => {
    const logger = loggerMock.create();
    const result = toFailureResult(new Error('inference blew up'), {
      logger,
      target: 'logs-*',
      phase: SEARCH_PHASE.RERANK,
    });
    expect(result).toMatchObject({ status: 'error', reason: 'execution' });
  });

  it('classifies a real TimeoutError as timeout in the capabilities phase', () => {
    const logger = loggerMock.create();
    const timeout = new errors.TimeoutError('timed out', {} as any);
    const result = toFailureResult(timeout, {
      logger,
      target: 'logs-*',
      phase: SEARCH_PHASE.CAPABILITIES,
    });
    expect(result).toMatchObject({ status: 'error', reason: 'timeout' });
  });

  it('classifies a plain Error with name TimeoutError as scope_too_large in the probe phase', () => {
    // Tests that the name-based fallback still works when the client surfaces a plain Error.
    const logger = loggerMock.create();
    const timeout = Object.assign(new Error('timed out'), { name: 'TimeoutError' });
    const result = toFailureResult(timeout, {
      logger,
      target: 'logs-*',
      phase: SEARCH_PHASE.PROBE,
    });
    expect(result).toMatchObject({ status: 'error', reason: 'scope_too_large' });
  });
});

// ---------------------------------------------------------------------------
// toFailureResult — execution fallback
// ---------------------------------------------------------------------------

describe('toFailureResult — execution', () => {
  it('classifies an unrecognized Error as execution and interpolates the message', () => {
    const logger = loggerMock.create();
    const err = new Error('verification_exception: shard failure');
    const result = toFailureResult(err, {
      logger,
      target: 'logs-*',
      phase: SEARCH_PHASE.SEARCH,
    });
    expect(result).toMatchObject({ status: 'error', reason: 'execution' });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('verification_exception: shard failure')
    );
  });

  it('handles a non-Error throw (bare string) without throwing', () => {
    const logger = loggerMock.create();
    const result = toFailureResult('something went wrong', {
      logger,
      target: 'logs-*',
      phase: SEARCH_PHASE.CAPABILITIES,
    });
    expect(result).toMatchObject({ status: 'error', reason: 'execution' });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('something went wrong'));
  });

  // Regression: observed against a cluster importing `.rerank-v1` for the first time. Elasticsearch
  // gave up on the deployment before our transport timeout fired, so the failure arrived as a
  // ResponseError and was classified `execution`, whose warning tells the caller not to retry. That
  // is the opposite of the correct advice for a model that is still loading.
  it('classifies an Elasticsearch model_deployment_timeout_exception as inference_not_ready', () => {
    const logger = loggerMock.create();
    const error = new errors.ResponseError({
      statusCode: 408,
      body: { error: { type: 'model_deployment_timeout_exception', reason: 'timed out' } },
      headers: {},
      warnings: null,
      meta: {} as never,
    });

    const result = toFailureResult(error, {
      logger,
      target: 'logs-*',
      phase: SEARCH_PHASE.RERANK,
    });

    expect(result).toMatchObject({ status: 'error', reason: 'inference_not_ready' });
  });

  it('classifies a model deployment timeout surfaced only in the message', () => {
    const logger = loggerMock.create();
    const result = toFailureResult(new Error('model_deployment_timeout_exception'), {
      logger,
      target: 'logs-*',
      phase: SEARCH_PHASE.RERANK,
    });

    expect(result).toMatchObject({ status: 'error', reason: 'inference_not_ready' });
  });

  // Regression: reproduced against a serverless project with `.rerank-v1` already started. The
  // deployment could not rank a full rank window inside Elasticsearch's own inference budget, and
  // the 408 it answers with carries the generic `status_exception`, so it read as `execution`.
  it('classifies a 408 status_exception as inference_not_ready in the rerank phase', () => {
    const logger = loggerMock.create();
    const error = new errors.ResponseError({
      statusCode: 408,
      body: {
        error: { type: 'status_exception', reason: 'timeout [30s] waiting for inference result' },
      },
      headers: {},
      warnings: null,
      meta: {} as never,
    });

    const result = toFailureResult(error, {
      logger,
      target: 'logs-*',
      phase: SEARCH_PHASE.RERANK,
    });

    expect(result).toMatchObject({
      status: 'error',
      reason: 'inference_not_ready',
      diagnostics: { phase: 'rerank', elasticsearchErrorType: 'status_exception' },
    });
  });

  // Observed on a hosted (EIS) endpoint, which sheds a request as 429 rather than 408.
  it('classifies a 429 timeout_exception as inference_not_ready in the rerank phase', () => {
    const logger = loggerMock.create();
    const error = new errors.ResponseError({
      statusCode: 429,
      body: {
        error: {
          type: 'timeout_exception',
          reason: 'Request timed out after [30s] for inference id [.jina-reranker-v3]',
        },
      },
      headers: {},
      warnings: null,
      meta: {} as never,
    });

    const result = toFailureResult(error, {
      logger,
      target: 'logs-*',
      phase: SEARCH_PHASE.RERANK,
    });

    expect(result).toMatchObject({ status: 'error', reason: 'inference_not_ready' });
  });

  // A 429 on its own is a rate limit, which is a different failure with different advice. Only the
  // timeout type promotes it, so this must not be swept in with the shape above.
  it('leaves a 429 that is not a timeout classified as execution', () => {
    const logger = loggerMock.create();
    const error = new errors.ResponseError({
      statusCode: 429,
      body: { error: { type: 'circuit_breaking_exception', reason: 'too much data' } },
      headers: {},
      warnings: null,
      meta: {} as never,
    });

    const result = toFailureResult(error, {
      logger,
      target: 'logs-*',
      phase: SEARCH_PHASE.RERANK,
    });

    expect(result).toMatchObject({ status: 'error', reason: 'execution' });
  });

  it('leaves an unrelated ResponseError in the rerank phase classified as execution', () => {
    const logger = loggerMock.create();
    const error = new errors.ResponseError({
      statusCode: 400,
      body: { error: { type: 'status_exception', reason: 'bad request' } },
      headers: {},
      warnings: null,
      meta: {} as never,
    });

    const result = toFailureResult(error, {
      logger,
      target: 'logs-*',
      phase: SEARCH_PHASE.RERANK,
    });

    expect(result).toMatchObject({ status: 'error', reason: 'execution' });
  });

  it('uses the phase-specific failed text in the log message', () => {
    const capLogger = loggerMock.create();
    toFailureResult(new Error('boom'), {
      logger: capLogger,
      target: 'logs-*',
      phase: SEARCH_PHASE.CAPABILITIES,
    });
    expect(capLogger.warn).toHaveBeenCalledWith(expect.stringContaining('capability check failed'));

    const probeLogger = loggerMock.create();
    toFailureResult(new Error('boom'), {
      logger: probeLogger,
      target: 'logs-*',
      phase: SEARCH_PHASE.PROBE,
    });
    expect(probeLogger.warn).toHaveBeenCalledWith(expect.stringContaining('count probe failed'));
  });
});

// ---------------------------------------------------------------------------
// toFailureResult — diagnostics
// ---------------------------------------------------------------------------

describe('toFailureResult — diagnostics', () => {
  const logger = () => loggerMock.create();

  it.each([
    SEARCH_PHASE.CAPABILITIES,
    SEARCH_PHASE.PROBE,
    SEARCH_PHASE.SEARCH,
    SEARCH_PHASE.RERANK,
  ])('reports the %s phase, so a failure says where it happened', (phase) => {
    const result = toFailureResult(new Error('boom'), {
      logger: logger(),
      target: 'logs-*',
      phase,
    });

    expect(result).toMatchObject({ diagnostics: { phase } });
  });

  it("reports Elasticsearch's own error type, which is what distinguishes the cause", () => {
    const responseError = new errors.ResponseError({
      body: { error: { type: 'verification_exception' } },
      statusCode: 400,
      headers: {},
      meta: {} as any,
      warnings: [],
    });

    const result = toFailureResult(responseError, {
      logger: logger(),
      target: 'logs-*',
      phase: SEARCH_PHASE.PROBE,
    });

    expect(result).toEqual({
      status: 'error',
      reason: 'execution',
      diagnostics: { phase: 'probe', elasticsearchErrorType: 'verification_exception' },
    });
  });

  it("falls back to the error's name when it did not come from Elasticsearch", () => {
    const result = toFailureResult(new TypeError('bad'), {
      logger: logger(),
      target: 'logs-*',
      phase: SEARCH_PHASE.SEARCH,
    });

    expect(result).toMatchObject({ diagnostics: { elasticsearchErrorType: 'TypeError' } });
  });

  it('omits the error type for a non-Error throw rather than inventing one', () => {
    const result = toFailureResult('a bare string', {
      logger: logger(),
      target: 'logs-*',
      phase: SEARCH_PHASE.SEARCH,
    });

    expect(result).toEqual({
      status: 'error',
      reason: 'execution',
      diagnostics: { phase: 'search' },
    });
  });

  it('never carries the underlying message, which is logged instead', () => {
    const log = logger();
    const secret = 'index logs-customer-42 field user.email';

    const result = toFailureResult(new Error(secret), {
      logger: log,
      target: 'logs-*',
      phase: SEARCH_PHASE.SEARCH,
    });

    expect(JSON.stringify(result)).not.toContain(secret);
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining(secret));
  });
});
