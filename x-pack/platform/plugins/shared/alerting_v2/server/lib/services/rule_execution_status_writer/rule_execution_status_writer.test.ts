/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleExecutionStatusWriter } from './rule_execution_status_writer';
import type { RulesSavedObjectServiceContract } from '../rules_saved_object_service/rules_saved_object_service';
import type { LoggerServiceContract } from '../logger_service/logger_service';

const createDependencies = () => {
  const rulesSavedObjectService: jest.Mocked<
    Pick<RulesSavedObjectServiceContract, 'partialUpdateLastExecution'>
  > = {
    partialUpdateLastExecution: jest.fn().mockResolvedValue(undefined),
  };
  const logger: jest.Mocked<LoggerServiceContract> = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  return { rulesSavedObjectService, logger };
};

describe('RuleExecutionStatusWriter', () => {
  it('forwards the patch to the rules SO service', async () => {
    const { rulesSavedObjectService, logger } = createDependencies();
    const writer = new RuleExecutionStatusWriter(
      rulesSavedObjectService as unknown as RulesSavedObjectServiceContract,
      logger
    );

    await writer.writeExecutionStatus({
      ruleId: 'rule-1',
      outcome: 'success',
      timestamp: '2026-04-22T00:00:05.000Z',
      durationMs: 1234,
      message: 'rule executed: rule-1',
    });

    expect(rulesSavedObjectService.partialUpdateLastExecution).toHaveBeenCalledWith({
      id: 'rule-1',
      patch: {
        outcome: 'success',
        timestamp: '2026-04-22T00:00:05.000Z',
        duration_ms: 1234,
        message: 'rule executed: rule-1',
        error_message: null,
      },
    });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('persists errorMessage when the execution failed', async () => {
    const { rulesSavedObjectService, logger } = createDependencies();
    const writer = new RuleExecutionStatusWriter(
      rulesSavedObjectService as unknown as RulesSavedObjectServiceContract,
      logger
    );

    await writer.writeExecutionStatus({
      ruleId: 'rule-2',
      outcome: 'failure',
      timestamp: '2026-04-22T00:01:00.000Z',
      durationMs: 42,
      message: 'rule execution failed: boom',
      errorMessage: 'boom',
    });

    expect(rulesSavedObjectService.partialUpdateLastExecution).toHaveBeenCalledWith({
      id: 'rule-2',
      patch: expect.objectContaining({
        outcome: 'failure',
        error_message: 'boom',
      }),
    });
  });

  it('swallows and logs SO errors without re-throwing', async () => {
    const { rulesSavedObjectService, logger } = createDependencies();
    const soError = new Error('SO write failed');
    rulesSavedObjectService.partialUpdateLastExecution.mockRejectedValueOnce(soError);

    const writer = new RuleExecutionStatusWriter(
      rulesSavedObjectService as unknown as RulesSavedObjectServiceContract,
      logger
    );

    await expect(
      writer.writeExecutionStatus({
        ruleId: 'rule-3',
        outcome: 'success',
        timestamp: '2026-04-22T00:02:00.000Z',
        durationMs: 10,
        message: 'ok',
      })
    ).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        error: soError,
        code: 'RULE_EXECUTION_STATUS_WRITE_ERROR',
        type: 'RuleExecutionStatusWriterError',
      })
    );
  });
});
