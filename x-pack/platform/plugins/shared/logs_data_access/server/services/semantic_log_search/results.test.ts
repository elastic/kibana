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
    expect(result).toEqual({ status: 'error', reason: 'cancelled' });
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
    expect(result).toEqual({ status: 'error', reason: 'cancelled' });
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
    expect(result).toEqual({ status: 'error', reason: 'scope_too_large' });
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
    expect(result).toEqual({ status: 'error', reason: 'timeout' });
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
    expect(result).toEqual({ status: 'error', reason: 'inference_not_ready' });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('still be loading its model'));
  });

  it('classifies a non-timeout rerank failure as execution, not inference_not_ready', () => {
    const logger = loggerMock.create();
    const result = toFailureResult(new Error('inference blew up'), {
      logger,
      target: 'logs-*',
      phase: SEARCH_PHASE.RERANK,
    });
    expect(result).toEqual({ status: 'error', reason: 'execution' });
  });

  it('classifies a real TimeoutError as timeout in the capabilities phase', () => {
    const logger = loggerMock.create();
    const timeout = new errors.TimeoutError('timed out', {} as any);
    const result = toFailureResult(timeout, {
      logger,
      target: 'logs-*',
      phase: SEARCH_PHASE.CAPABILITIES,
    });
    expect(result).toEqual({ status: 'error', reason: 'timeout' });
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
    expect(result).toEqual({ status: 'error', reason: 'scope_too_large' });
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
    expect(result).toEqual({ status: 'error', reason: 'execution' });
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
    expect(result).toEqual({ status: 'error', reason: 'execution' });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('something went wrong'));
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
