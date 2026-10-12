/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { DiagnosticResult } from '@elastic/elasticsearch';
import { errors } from '@elastic/elasticsearch';
import { ErrorHandlingMiddleware } from './error_handling_middleware';
import { createRuleExecutionMiddlewareContext } from './test_utils';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import { collectStreamResults, createPipelineStream, createRulePipelineState } from '../test_utils';
import { createExecutionContext, RuleExecutionCancellationError } from '../../execution_context';

describe('ErrorHandlingMiddleware', () => {
  let middleware: ErrorHandlingMiddleware;
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    const { loggerService, mockLogger } = createLoggerService();
    logger = mockLogger;
    middleware = new ErrorHandlingMiddleware(loggerService);
  });

  it('calls next and returns result on success', async () => {
    const expectedState = createRulePipelineState();
    const next = jest.fn().mockReturnValue(createPipelineStream([expectedState]));

    const context = createRuleExecutionMiddlewareContext();
    const result = await collectStreamResults(
      middleware.execute(context, next, createPipelineStream([expectedState]))
    );

    expect(result).toEqual([{ type: 'continue', state: expectedState }]);
    expect(next).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('logs error and rethrows on failure', async () => {
    const error = new Error('Step failed');
    const next = jest.fn().mockReturnValue(
      (async function* () {
        throw error;
      })()
    );
    const context = createRuleExecutionMiddlewareContext({ name: 'fetch_rule' });

    await expect(
      collectStreamResults(middleware.execute(context, next, createPipelineStream()))
    ).rejects.toThrow('Step failed');
    expect(logger.error).toHaveBeenCalledWith(
      'Step failed',
      expect.objectContaining({
        labels: {
          code: ALERTING_LOG_CODES.RULE_EXECUTION_STEP_FAILED,
          step: 'fetch_rule',
        },
      })
    );
  });

  it('overrides the message for ES|QL user errors so the query fragment is not logged', async () => {
    const error = new errors.ResponseError({
      statusCode: 400,
      body: {
        error: {
          type: 'verification_exception',
          reason: 'Found 1 problem\nline 1:1: Unknown column [secret_field]',
        },
      },
    } as DiagnosticResult);
    const next = jest.fn().mockReturnValue(
      (async function* () {
        throw error;
      })()
    );
    const context = createRuleExecutionMiddlewareContext({ name: 'execute_rule_query' });

    await expect(
      collectStreamResults(middleware.execute(context, next, createPipelineStream()))
    ).rejects.toBe(error);

    expect(logger.error).toHaveBeenCalledWith(
      'Rule query failed to parse or verify',
      expect.objectContaining({
        labels: {
          code: ALERTING_LOG_CODES.RULE_EXECUTION_STEP_FAILED,
          step: 'execute_rule_query',
        },
        error: expect.objectContaining({
          message: 'Rule query failed to parse or verify',
        }),
      })
    );
    const loggedMessage = (logger.error as jest.Mock).mock.calls[0][0] as string;
    expect(loggedMessage).not.toContain('secret_field');
  });

  it('logs an error only once when it propagates through multiple middleware layers', async () => {
    const error = new Error('Step failed');
    const { loggerService, mockLogger } = createLoggerService();
    const originLayer = new ErrorHandlingMiddleware(loggerService);
    const downstreamLayer = new ErrorHandlingMiddleware(loggerService);

    // The origin step's layer is innermost: it catches the error first, then
    // rethrows it up through the downstream step's layer, mirroring the pipeline.
    const next = jest.fn().mockReturnValue(
      (async function* () {
        throw error;
      })()
    );
    const innerStream = originLayer.execute(
      createRuleExecutionMiddlewareContext({ name: 'execute_rule_query' }),
      next,
      createPipelineStream()
    );
    const outerStream = downstreamLayer.execute(
      createRuleExecutionMiddlewareContext({ name: 'store_alert_events' }),
      () => innerStream,
      createPipelineStream()
    );

    await expect(collectStreamResults(outerStream)).rejects.toBe(error);

    expect(mockLogger.error).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Step failed',
      expect.objectContaining({
        labels: expect.objectContaining({ step: 'execute_rule_query' }),
      })
    );
  });

  it('does not log RULE_EXECUTION_STEP_FAILED for a bare-abort cancellation', async () => {
    const abortController = new AbortController();
    abortController.abort();
    const executionContext = createExecutionContext(abortController.signal);

    const next = jest.fn().mockReturnValue(
      (async function* () {
        executionContext.throwIfAborted();
      })()
    );

    const context = createRuleExecutionMiddlewareContext({ name: 'execute_rule_query' });

    await expect(
      collectStreamResults(middleware.execute(context, next, createPipelineStream()))
    ).rejects.toThrow(RuleExecutionCancellationError);

    expect(logger.error).not.toHaveBeenCalled();
  });
});
