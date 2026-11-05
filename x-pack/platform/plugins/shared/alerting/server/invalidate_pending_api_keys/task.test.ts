/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';
import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import type { RunContext } from '@kbn/task-manager-plugin/server';
import type { InvalidationRunnerOptions } from '@kbn/response-ops-api-keys';
import { createInvalidationRunner } from '@kbn/response-ops-api-keys';
import { ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE } from '@kbn/actions-plugin/server/constants/saved_objects';
import type { AlertingConfig } from '../config';
import type { AlertingPluginsStart } from '../plugin';
import { AD_HOC_RUN_SAVED_OBJECT_TYPE } from '../saved_objects';
import { emptyState } from './task_state';
import { taskRunner } from './task';

jest.mock('@kbn/response-ops-api-keys', () => ({
  ...jest.requireActual('@kbn/response-ops-api-keys'),
  createInvalidationRunner: jest.fn(),
}));

const createInvalidationRunnerMock = createInvalidationRunner as jest.Mock;

const config = {
  invalidateApiKeysTask: { interval: '5m', removalDelay: '1h' },
} as AlertingConfig;

function getRunner() {
  const coreStart = coreMock.createStart();
  const pluginsStart = {
    encryptedSavedObjects: encryptedSavedObjectsMock.createStart(),
    security: { authc: { apiKeys: { invalidateAsInternalUser: jest.fn() } } },
  } as unknown as AlertingPluginsStart;

  return taskRunner(
    loggingSystemMock.createLogger(),
    Promise.resolve([coreStart as CoreStart, pluginsStart, undefined]),
    config
  )({
    taskInstance: { state: { runs: 0, total_invalidated: 0, missing_api_key_retries: {} } },
  } as unknown as RunContext);
}

const getRunnerOptions = (): InvalidationRunnerOptions =>
  createInvalidationRunnerMock.mock.calls[0][0];

describe('alerts_invalidate_api_keys task runner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createInvalidationRunnerMock.mockReturnValue({
      run: jest.fn().mockResolvedValue({ ...emptyState, runs: 1 }),
    });
  });

  it('returns the runner state on the configured interval', async () => {
    expect(await getRunner().run()).toEqual({
      state: { ...emptyState, runs: 1 },
      schedule: { interval: '5m' },
    });
    expect(getRunnerOptions()).toEqual(
      expect.objectContaining({ pluginTag: 'alerting', removalDelay: '1h' })
    );
  });

  it('queries uiamApiKeyId alongside apiKeyId so pending jobs holding a UIAM key count as in use', async () => {
    await getRunner().run();

    // A UIAM key is queued for invalidation under its own id, which pending jobs record in
    // `uiamApiKeyId` — without these paths the guard can never see them and revokes a live key.
    expect(await getRunnerOptions().getRunDependencies()).toEqual(
      expect.objectContaining({
        savedObjectTypesToQuery: [
          {
            type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
            apiKeyAttributePath: `${AD_HOC_RUN_SAVED_OBJECT_TYPE}.attributes.apiKeyId`,
          },
          {
            type: ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
            apiKeyAttributePath: `${ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE}.attributes.apiKeyId`,
          },
          {
            type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
            apiKeyAttributePath: `${AD_HOC_RUN_SAVED_OBJECT_TYPE}.attributes.uiamApiKeyId`,
          },
          {
            type: ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
            apiKeyAttributePath: `${ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE}.attributes.uiamApiKeyId`,
          },
        ],
      })
    );
  });

  it('logs a failed run as a warning', async () => {
    const logger = loggingSystemMock.createLogger();
    taskRunner(logger, Promise.resolve([] as never), config);

    getRunnerOptions().onError?.(new Error('boom'));

    expect(logger.warn).toHaveBeenCalledWith(
      'Error executing alerting apiKey invalidation task: boom'
    );
  });
});
