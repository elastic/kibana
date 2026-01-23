/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ErrorHandlingMiddleware } from './error_handling_middleware';
import type { MiddlewareContext } from './types';
import type { RuleStepOutput } from '../types';
import { createLoggerService, createRuleExecutionInput } from '../../test_utils';

describe('ErrorHandlingMiddleware', () => {
  const createContext = (): MiddlewareContext => ({
    step: { name: 'test_step', execute: jest.fn() },
    state: { input: createRuleExecutionInput() },
  });

  it('calls next and returns result on success', async () => {
    const { loggerService, mockLogger } = createLoggerService();
    const middleware = new ErrorHandlingMiddleware(loggerService);

    const expectedResult: RuleStepOutput = { type: 'continue' };
    const next = jest.fn().mockResolvedValue(expectedResult);

    const context = createContext();
    const result = await middleware.execute(context, next);

    expect(result).toEqual(expectedResult);
    expect(next).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('returns halt result without logging error', async () => {
    const { loggerService, mockLogger } = createLoggerService();
    const middleware = new ErrorHandlingMiddleware(loggerService);

    const expectedResult: RuleStepOutput = { type: 'halt', reason: 'rule_deleted' };
    const next = jest.fn().mockResolvedValue(expectedResult);

    const context = createContext();
    const result = await middleware.execute(context, next);

    expect(result).toEqual(expectedResult);
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('logs error and rethrows on failure', async () => {
    const { loggerService, mockLogger } = createLoggerService();
    const middleware = new ErrorHandlingMiddleware(loggerService);

    const error = new Error('Step failed');
    const next = jest.fn().mockRejectedValue(error);

    const context: MiddlewareContext = {
      step: { name: 'failing_step', execute: jest.fn() },
      state: { input: createRuleExecutionInput() },
    };

    await expect(middleware.execute(context, next)).rejects.toThrow('Step failed');
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Step failed'),
      expect.objectContaining({
        error: expect.objectContaining({
          type: 'StepExecutionError',
          code: 'failing_step',
        }),
      })
    );
  });

  it('handles non-Error objects and logs them as errors', async () => {
    const { loggerService, mockLogger } = createLoggerService();
    const middleware = new ErrorHandlingMiddleware(loggerService);

    const next = jest.fn().mockRejectedValue('string error');

    const context = createContext();

    await expect(middleware.execute(context, next)).rejects.toBe('string error');
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('has correct middleware name', () => {
    const { loggerService } = createLoggerService();
    const middleware = new ErrorHandlingMiddleware(loggerService);

    expect(middleware.name).toBe('error_handling');
  });
});
