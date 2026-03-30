/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { ErrorHandlingMiddleware } from './error_handling_middleware';
import { createRuleExecutionMiddlewareContext } from './test_utils';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { collectStreamResults, createPipelineStream, createRulePipelineState } from '../test_utils';

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
    const context = createRuleExecutionMiddlewareContext();

    await expect(
      collectStreamResults(middleware.execute(context, next, createPipelineStream()))
    ).rejects.toThrow('Step failed');
    expect(logger.error).toHaveBeenCalled();
  });
});
