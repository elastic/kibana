/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { range } from 'lodash';
import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { IRuleTypeAlerts } from '../types';
import {
  createResourceInstallationHelper,
  errorResult,
  InitializationPromise,
  ResourceInstallationHelper,
  successResult,
  calculateDelay,
  getShouldRetry,
} from './create_resource_installation_helper';
import { retryUntil } from './test_utils';

const logger: ReturnType<(typeof loggingSystemMock)['createLogger']> =
  loggingSystemMock.createLogger();

const initFn = async (context: IRuleTypeAlerts, namespace: string, timeoutMs?: number) => {
  logger.info(`${context.context}_${namespace}`);
};

const initFnWithError = async (context: IRuleTypeAlerts, namespace: string, timeoutMs?: number) => {
  throw new Error('no go');
};

const getCommonInitPromise = async (
  resolution: boolean,
  timeoutMs: number = 1,
  customLogString: string = ''
): Promise<InitializationPromise> => {
  if (timeoutMs < 0) {
    throw new Error('fail');
  }
  // delay resolution of promise by timeout value
  await new Promise((r) => setTimeout(r, timeoutMs));
  const customLog = customLogString && customLogString.length > 0 ? ` - ${customLogString}` : '';
  logger.info(`commonInitPromise resolved${customLog}`);
  return Promise.resolve(resolution ? successResult() : errorResult(`error initializing`));
};

const getContextInitialized = async (
  helper: ResourceInstallationHelper,
  context: string = 'test1',
  namespace: string = DEFAULT_NAMESPACE_STRING
) => {
  const { result } = await helper.getInitializedContext(context, namespace);
  return result;
};

describe('createResourceInstallationHelper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test(`should wait for commonInitFunction to resolve before calling initFns for registered contexts`, async () => {
    const helper = createResourceInstallationHelper(
      logger,
      getCommonInitPromise(true, 100),
      initFn
    );

    // Add two contexts that need to be initialized
    helper.add({
      context: 'test1',
      mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
    });
    helper.add({
      context: 'test2',
      mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
    });

    await retryUntil('init fns run', async () => logger.info.mock.calls.length === 3);

    expect(logger.info).toHaveBeenNthCalledWith(1, `commonInitPromise resolved`);
    expect(logger.info).toHaveBeenNthCalledWith(2, 'test1_default');
    expect(logger.info).toHaveBeenNthCalledWith(3, 'test2_default');
    expect(await helper.getInitializedContext('test1', DEFAULT_NAMESPACE_STRING)).toEqual({
      result: true,
    });
    expect(await helper.getInitializedContext('test2', DEFAULT_NAMESPACE_STRING)).toEqual({
      result: true,
    });
  });

  test(`should return false if context is unrecognized`, async () => {
    const helper = createResourceInstallationHelper(
      logger,
      getCommonInitPromise(true, 100),
      initFn
    );

    helper.add({
      context: 'test1',
      mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
    });

    await retryUntil('init fns run', async () => logger.info.mock.calls.length === 2);

    expect(await helper.getInitializedContext('test1', DEFAULT_NAMESPACE_STRING)).toEqual({
      result: true,
    });
    expect(await helper.getInitializedContext('test2', DEFAULT_NAMESPACE_STRING)).toEqual({
      result: false,
      error: `Unrecognized context test2_default`,
    });
  });

  test(`should log and return false if common init function returns false`, async () => {
    const helper = createResourceInstallationHelper(
      logger,
      getCommonInitPromise(false, 100),
      initFn
    );

    helper.add({
      context: 'test1',
      mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
    });

    await retryUntil('common init fns run', async () => logger.info.mock.calls.length === 1);

    expect(logger.warn).toHaveBeenCalledWith(
      `Common resources were not initialized, cannot initialize context for test1`
    );
    expect(await helper.getInitializedContext('test1', DEFAULT_NAMESPACE_STRING)).toEqual({
      result: false,
      error: `error initializing`,
    });
  });

  test(`should log and return false if common init function throws error`, async () => {
    const helper = createResourceInstallationHelper(logger, getCommonInitPromise(true, -1), initFn);

    helper.add({
      context: 'test1',
      mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
    });

    await retryUntil(
      'common init fns run',
      async () => (await getContextInitialized(helper)) === false
    );

    expect(logger.error).toHaveBeenCalledWith(`Error initializing context test1 - fail`);
    expect(await helper.getInitializedContext('test1', DEFAULT_NAMESPACE_STRING)).toEqual({
      result: false,
      error: `fail`,
    });
  });

  test(`should log and return false if context init function throws error`, async () => {
    const helper = createResourceInstallationHelper(
      logger,
      getCommonInitPromise(true, 100),
      initFnWithError
    );

    helper.add({
      context: 'test1',
      mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
    });

    await retryUntil(
      'context init fns run',
      async () => (await getContextInitialized(helper)) === false
    );

    expect(logger.error).toHaveBeenCalledWith(`Error initializing context test1 - no go`);
    expect(await helper.getInitializedContext('test1', DEFAULT_NAMESPACE_STRING)).toEqual({
      result: false,
      error: `no go`,
    });
  });

  test(`should retry using new common init function if specified`, async () => {
    const context = {
      context: 'test1',
      mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
    };
    const helper = createResourceInstallationHelper(
      logger,
      getCommonInitPromise(false, 100),
      initFn
    );

    helper.add(context);

    await retryUntil('common init fns run', async () => logger.info.mock.calls.length === 1);

    expect(logger.warn).toHaveBeenCalledWith(
      `Common resources were not initialized, cannot initialize context for test1`
    );
    expect(await helper.getInitializedContext('test1', DEFAULT_NAMESPACE_STRING)).toEqual({
      result: false,
      error: `error initializing`,
    });

    helper.retry(context, undefined, getCommonInitPromise(true, 100, 'after retry'));

    await retryUntil('common init fns run', async () => logger.info.mock.calls.length === 2);
    expect(logger.info).toHaveBeenCalledWith(`commonInitPromise resolved - after retry`);
    expect(await helper.getInitializedContext('test1', DEFAULT_NAMESPACE_STRING)).toEqual({
      result: true,
    });
  });

  test(`should retry context init function`, async () => {
    const initFnErrorOnce = jest
      .fn()
      .mockImplementationOnce(() => {
        throw new Error('first error');
      })
      .mockImplementation((context: IRuleTypeAlerts, namespace: string, timeoutMs?: number) => {
        logger.info(`${context.context}_${namespace} successfully retried`);
      });
    const context = {
      context: 'test1',
      mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
    };
    const helper = createResourceInstallationHelper(
      logger,
      getCommonInitPromise(true, 100),
      initFnErrorOnce
    );

    helper.add(context);

    await retryUntil(
      'context init fns run',
      async () => (await getContextInitialized(helper)) === false
    );

    expect(logger.error).toHaveBeenCalledWith(`Error initializing context test1 - first error`);
    expect(await helper.getInitializedContext('test1', DEFAULT_NAMESPACE_STRING)).toEqual({
      result: false,
      error: `first error`,
    });

    helper.retry(context, undefined);

    await retryUntil('init fns retried', async () => logger.info.mock.calls.length === 3);

    expect(logger.info).toHaveBeenNthCalledWith(1, `commonInitPromise resolved`);
    expect(logger.info).toHaveBeenNthCalledWith(
      2,
      `Retrying resource initialization for context "test1"`
    );
    expect(logger.info).toHaveBeenNthCalledWith(3, 'test1_default successfully retried');
    expect(await helper.getInitializedContext('test1', DEFAULT_NAMESPACE_STRING)).toEqual({
      result: true,
    });
  });

  test(`should throttle retry`, async () => {
    const initFnErrorOnce = jest
      .fn()
      .mockImplementationOnce(() => {
        throw new Error('first error');
      })
      .mockImplementationOnce(() => {
        throw new Error('second error');
      })
      .mockImplementation((context: IRuleTypeAlerts, namespace: string, timeoutMs?: number) => {
        logger.info(`${context.context}_${namespace} successfully retried`);
      });
    const context = {
      context: 'test1',
      mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
    };
    const helper = createResourceInstallationHelper(
      logger,
      getCommonInitPromise(true, 100),
      initFnErrorOnce
    );

    helper.add(context);

    await retryUntil(
      'context init fns run',
      async () => (await getContextInitialized(helper)) === false
    );

    expect(logger.error).toHaveBeenCalledWith(`Error initializing context test1 - first error`);
    expect(await helper.getInitializedContext('test1', DEFAULT_NAMESPACE_STRING)).toEqual({
      result: false,
      error: `first error`,
    });

    logger.info.mockClear();
    logger.error.mockClear();

    helper.retry(context, undefined);
    await new Promise((r) => setTimeout(r, 10));
    helper.retry(context, undefined);

    await retryUntil('init fns retried', async () => {
      return logger.error.mock.calls.length === 1;
    });

    expect(logger.error).toHaveBeenCalledWith(`Error initializing context test1 - second error`);

    // the second retry is throttled so this is never called
    expect(logger.info).not.toHaveBeenCalledWith('test1_default successfully retried');
    expect(await helper.getInitializedContext('test1', DEFAULT_NAMESPACE_STRING)).toEqual({
      result: false,
      error: 'second error',
    });
  });
});

describe('calculateDelay', () => {
  test('should return 30 seconds if attempts = 1', () => {
    expect(calculateDelay(1)).toEqual(30000);
  });

  test('should return multiple of 5 minutes if attempts > 1', () => {
    range(2, 20).forEach((attempt: number) => {
      expect(calculateDelay(attempt)).toEqual(Math.pow(2, attempt - 2) * 120000);
    });
  });
});

describe('getShouldRetry', () => {
  test('should return true if current time is past the previous retry time + the retry delay', () => {
    const now = new Date();
    const retry = {
      time: new Date(now.setMinutes(now.getMinutes() - 1)).toISOString(),
      attempts: 1,
    };
    expect(getShouldRetry(retry)).toEqual(true);
  });

  test('should return false if current time is not past the previous retry time + the retry delay', () => {
    const now = new Date();
    const retry = {
      time: new Date(now.setMinutes(now.getMinutes() - 1)).toISOString(),
      attempts: 2,
    };
    expect(getShouldRetry(retry)).toEqual(false);
  });
});
