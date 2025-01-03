/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Logger, SavedObjectsErrorHelpers } from '@kbn/core/server';
import { retryIfConflicts, RetryForConflictsAttempts } from './retry_if_conflicts';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';

jest.mock('@kbn/core/server');

const mockLogger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

describe('retryIfConflicts', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = mockLogger;
    (SavedObjectsErrorHelpers.isConflictError as jest.Mock).mockReturnValue(true);
  });

  it('should execute operation successfully without conflicts', async () => {
    const operation = jest.fn().mockResolvedValue('success');
    const result = await retryIfConflicts(logger, 'testOperation', operation);
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry the operation on conflict error', async () => {
    const operation = jest.fn().mockRejectedValueOnce('conflict').mockResolvedValueOnce('success');

    const result = await retryIfConflicts(logger, 'testOperation', operation);
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
    expect(logger.debug).toHaveBeenCalledWith('testOperation conflict, retrying ...');
  });

  it('should throw error if maximum retries exceeded', async () => {
    const operation = jest.fn().mockRejectedValue('conflict');

    await expect(retryIfConflicts(logger, 'testOperation', operation)).rejects.toBe('conflict');
    expect(operation).toHaveBeenCalledTimes(RetryForConflictsAttempts + 1);
    expect(logger.warn).toHaveBeenCalledWith('testOperation conflict, exceeded retries');
  });

  it('should throw non-conflict error immediately', async () => {
    (SavedObjectsErrorHelpers.isConflictError as jest.Mock).mockReturnValue(false);
    const nonConflictError = new Error('non-conflict error');
    const operation = jest.fn().mockRejectedValue(nonConflictError);

    await expect(retryIfConflicts(logger, 'testOperation', operation)).rejects.toThrow(
      nonConflictError
    );
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
