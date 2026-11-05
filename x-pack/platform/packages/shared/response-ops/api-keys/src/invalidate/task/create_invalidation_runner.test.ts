/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { createInvalidationRunner } from './create_invalidation_runner';
import { runInvalidate } from './run_invalidate';

jest.mock('./run_invalidate', () => ({ runInvalidate: jest.fn() }));

const runInvalidateMock = runInvalidate as jest.Mock;

describe('createInvalidationRunner', () => {
  const logger = loggerMock.create();
  const savedObjectsClient = savedObjectsClientMock.create();
  const dependencies = {
    savedObjectsClient,
    savedObjectType: 'api_key_pending_invalidation',
    savedObjectTypesToQuery: [],
  };

  const createRunner = (onError?: (error: unknown) => void) =>
    createInvalidationRunner({
      logger,
      pluginTag: 'test',
      removalDelay: '1h',
      getRunDependencies: () => dependencies,
      onError,
    });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('runs one pass and advances the state', async () => {
    runInvalidateMock.mockResolvedValue({ totalInvalidated: 3, missingApiKeyRetries: { b: 1 } });

    await expect(
      createRunner().run({ runs: 2, total_invalidated: 9, missing_api_key_retries: { a: 2 } })
    ).resolves.toEqual({ runs: 3, total_invalidated: 3, missing_api_key_retries: { b: 1 } });
    expect(runInvalidateMock).toHaveBeenCalledWith({
      ...dependencies,
      logger,
      missingApiKeyRetries: { a: 2 },
      pluginTag: 'test',
      removalDelay: '1h',
    });
    expect(logger.debug).toHaveBeenCalledWith('Invalidated a total of 3 API keys.');
  });

  it('logs a failed pass and keeps the previous retries', async () => {
    runInvalidateMock.mockRejectedValue(new Error('boom'));

    await expect(createRunner().run({ missing_api_key_retries: { a: 2 } })).resolves.toEqual({
      runs: 1,
      total_invalidated: 0,
      missing_api_key_retries: { a: 2 },
    });
    expect(logger.error).toHaveBeenCalledWith(
      'Error invalidating test API keys: boom',
      expect.anything()
    );
  });

  it('reports a failed pass to onError instead of logging it', async () => {
    const error = new Error('boom');
    const onError = jest.fn();
    runInvalidateMock.mockRejectedValue(error);

    await createRunner(onError).run({});

    expect(onError).toHaveBeenCalledWith(error);
    expect(logger.error).not.toHaveBeenCalled();
  });
});
