/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { isRetryableShardRecoveryError, withShardRecoveryRetry } from './retry_shard_recovery';

describe('isRetryableShardRecoveryError', () => {
  it('returns true for 503 status code', () => {
    expect(isRetryableShardRecoveryError({ statusCode: 503 })).toBe(true);
  });

  it('returns true for no_shard_available_action_exception message', () => {
    expect(
      isRetryableShardRecoveryError(
        new Error('no_shard_available_action_exception: shard unavailable')
      )
    ).toBe(true);
  });

  it('returns true for recovering illegal shard state error', () => {
    expect(
      isRetryableShardRecoveryError({
        meta: {
          body: {
            error: {
              type: 'illegal_index_shard_state_exception',
              reason:
                'CurrentState[RECOVERING] operations only allowed when shard state is one of [POST_RECOVERY, STARTED]',
            },
          },
        },
      })
    ).toBe(true);
  });

  it('returns false for non-retryable error', () => {
    expect(isRetryableShardRecoveryError({ statusCode: 400 })).toBe(false);
  });
});

describe('withShardRecoveryRetry', () => {
  it('retries shard-recovery errors and succeeds', async () => {
    const logger = loggerMock.create();
    const action = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(new Error('no_shard_available_action_exception'))
      .mockResolvedValue('ok');

    const result = await withShardRecoveryRetry({
      logger,
      operation: 'test-operation',
      action,
      maxRetries: 3,
      initialDelayMs: 0,
    });

    expect(result).toBe('ok');
    expect(action).toHaveBeenCalledTimes(2);
    expect(logger.debug).toHaveBeenCalledTimes(1);
  });

  it('does not retry non-retryable errors', async () => {
    const logger = loggerMock.create();
    const action = jest.fn<Promise<string>, []>().mockRejectedValue(new Error('bad_request'));

    await expect(
      withShardRecoveryRetry({
        logger,
        operation: 'test-operation',
        action,
        maxRetries: 3,
        initialDelayMs: 0,
      })
    ).rejects.toThrow('bad_request');

    expect(action).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenCalledTimes(0);
  });

  it('stops retrying when max retries is reached', async () => {
    const logger = loggerMock.create();
    const action = jest
      .fn<Promise<string>, []>()
      .mockRejectedValue(new Error('no_shard_available_action_exception'));

    await expect(
      withShardRecoveryRetry({
        logger,
        operation: 'test-operation',
        action,
        maxRetries: 2,
        initialDelayMs: 0,
      })
    ).rejects.toThrow('no_shard_available_action_exception');

    expect(action).toHaveBeenCalledTimes(2);
    expect(logger.debug).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      '[inference.anonymization.retry_exhausted] operation=test-operation attempts=2 reason=shard_recovering'
    );
  });
});
