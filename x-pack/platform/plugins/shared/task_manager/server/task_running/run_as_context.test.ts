/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { httpServerMock } from '@kbn/core/server/mocks';
import type { TaskRunAs } from '../task';
import { TaskErrorSource } from '../../common/constants';
import { getErrorSource } from './errors';
import { createRunAsContext } from './run_as_context';

const runAs: TaskRunAs = {
  workloadType: 'workflow',
  workloadId: 'workflow-1',
  spaceId: 'default',
  expectedServiceAccountId: 'service-account-1',
};
const workload = { workloadType: 'workflow', workloadId: 'workflow-1', spaceId: 'default' };

const getRejection = async <T>(promise: Promise<T>): Promise<Error> => {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('Expected the promise to reject');
};

describe('createRunAsContext', () => {
  const request = httpServerMock.createKibanaRequest();
  const withScopedRequest = jest.fn();
  const definitionRunAs = { workloadTypes: ['workflow'], withScopedRequest };

  beforeEach(() => {
    jest.resetAllMocks();
    withScopedRequest.mockImplementation(async (_params, fn) => fn(request));
  });

  test("runs `fn` with the definition's scoped request and returns its result", async () => {
    const fn = jest.fn().mockResolvedValue('result');

    await expect(createRunAsContext(definitionRunAs, runAs).withScopedRequest(fn)).resolves.toBe(
      'result'
    );

    expect(fn).toHaveBeenCalledWith(request);
    expect(withScopedRequest).toHaveBeenCalledWith(
      { ...workload, expectedServiceAccountId: 'service-account-1' },
      expect.any(Function)
    );
  });

  test.each([
    ['the stored one when none is passed', 'service-account-1', undefined, 'service-account-1'],
    ['the stored one when null is passed', 'service-account-1', null, 'service-account-1'],
    [
      'the stored one when the same is passed',
      'service-account-1',
      'service-account-1',
      'service-account-1',
    ],
    ['the passed one when none is stored', null, 'service-account-2', 'service-account-2'],
  ])('expects %s', async (_description, storedPin, runTimePin, expectedServiceAccountId) => {
    await createRunAsContext(definitionRunAs, {
      ...runAs,
      expectedServiceAccountId: storedPin,
    }).withScopedRequest(async () => {}, { expectedServiceAccountId: runTimePin });

    expect(withScopedRequest).toHaveBeenCalledWith(
      { ...workload, expectedServiceAccountId },
      expect.any(Function)
    );
  });

  test.each([
    ['no options are', undefined],
    ['no pin is', {}],
    ['a null pin is', { expectedServiceAccountId: null }],
  ])(
    'expects no service account when none is stored and %s passed',
    async (_description, options) => {
      await createRunAsContext(definitionRunAs, {
        ...runAs,
        expectedServiceAccountId: null,
      }).withScopedRequest(async () => {}, options);

      expect(withScopedRequest).toHaveBeenCalledWith(workload, expect.any(Function));
    }
  );

  test('rejects a different service account than the stored one without minting', async () => {
    const fn = jest.fn();

    const error = await getRejection(
      createRunAsContext(definitionRunAs, runAs).withScopedRequest(fn, {
        expectedServiceAccountId: 'service-account-2',
      })
    );

    expect(error).toMatchObject({ output: { statusCode: 403 } });
    expect(error.message).toBe(
      'The expected service account differs from the one the task was scheduled with.'
    );
    expect(getErrorSource(error)).toBe(TaskErrorSource.USER);
    expect(withScopedRequest).not.toHaveBeenCalled();
    expect(fn).not.toHaveBeenCalled();
  });

  test.each([
    ['a missing binding', Boom.notFound('No binding'), TaskErrorSource.USER],
    ['a binding to another service account', Boom.forbidden('Mismatch'), TaskErrorSource.USER],
    [
      'a failed token exchange',
      Object.assign(new Error('Exchange failed'), { name: 'ServiceAccountTokenExchangeError' }),
      TaskErrorSource.USER,
    ],
    ['any other Boom error', Boom.badImplementation('Oops'), TaskErrorSource.FRAMEWORK],
    ['a plain error', new Error('Service accounts are disabled'), TaskErrorSource.FRAMEWORK],
  ])(
    'tags %s before `fn` is entered with its source',
    async (_description, thrownError, expectedSource) => {
      withScopedRequest.mockRejectedValueOnce(thrownError);
      const fn = jest.fn();

      const error = await getRejection(
        createRunAsContext(definitionRunAs, runAs).withScopedRequest(fn)
      );

      expect(error).toBe(thrownError);
      expect(getErrorSource(error)).toBe(expectedSource);
      expect(fn).not.toHaveBeenCalled();
    }
  );

  test('passes errors from `fn` through untagged', async () => {
    const thrownError = Boom.notFound('Not found by the task');

    const error = await getRejection(
      createRunAsContext(definitionRunAs, runAs).withScopedRequest(async () => {
        throw thrownError;
      })
    );

    expect(error).toBe(thrownError);
    expect(getErrorSource(error)).toBeUndefined();
  });
});
