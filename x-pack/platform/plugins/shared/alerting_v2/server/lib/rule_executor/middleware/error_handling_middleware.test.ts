/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { ErrorHandlingMiddleware } from './error_handling_middleware';
import type { RuleExecutionMiddlewareContext } from './types';
import type { RuleStepOutput } from '../types';
import { createRuleExecutionInput } from '../test_utils';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';

describe('ErrorHandlingMiddleware', () => {
  let middleware: ErrorHandlingMiddleware;
  let logger: jest.Mocked<Logger>;

  const createContext = (): RuleExecutionMiddlewareContext => ({
    step: { name: 'test_step', execute: jest.fn() },
    state: { input: createRuleExecutionInput() },
  });

  beforeEach(() => {
    const { loggerService, mockLogger } = createLoggerService();
    logger = mockLogger;
    middleware = new ErrorHandlingMiddleware(loggerService);
  });

  it('calls next and returns result on success', async () => {
    const expectedResult: RuleStepOutput = { type: 'continue' };
    const next = jest.fn().mockResolvedValue(expectedResult);

    const context = createContext();
    const result = await middleware.execute(context, next);

    expect(result).toEqual(expectedResult);
    expect(next).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('logs error and rethrows on failure', async () => {
    const error = new Error('Step failed');
    const next = jest.fn().mockRejectedValue(error);
    const context = createContext();

    await expect(middleware.execute(context, next)).rejects.toThrow('Step failed');
    expect(logger.error).toHaveBeenCalled();
  });
});
