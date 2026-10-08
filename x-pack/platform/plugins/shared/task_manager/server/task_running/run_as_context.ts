/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { KibanaRequest } from '@kbn/core/server';
import type { TaskRunAs, TaskRunAsContext, TaskRunAsDefinition } from '../task';
import { TaskErrorSource } from '../../common/constants';
import { createTaskRunError } from './errors';

// The Security plugin doesn't export the error class, so it is recognized by name.
const TOKEN_EXCHANGE_ERROR_NAME = 'ServiceAccountTokenExchangeError';

const getErrorSourceBeforeEntry = (error: Error): TaskErrorSource => {
  const isBindingError = Boom.isBoom(error) && [403, 404].includes(error.output.statusCode);
  return isBindingError || error.name === TOKEN_EXCHANGE_ERROR_NAME
    ? TaskErrorSource.USER
    : TaskErrorSource.FRAMEWORK;
};

/**
 * Builds the `runAs` a task runner gets for the workload named by the task's verified credential.
 * Errors thrown before `fn` is entered are tagged with their source; errors from `fn` are the
 * task's own and pass through unchanged.
 */
export const createRunAsContext = (
  definitionRunAs: TaskRunAsDefinition,
  { workloadType, workloadId, spaceId, expectedServiceAccountId: storedPin }: TaskRunAs
): TaskRunAsContext => ({
  withScopedRequest: async <T>(
    fn: (request: KibanaRequest) => Promise<T>,
    options?: { expectedServiceAccountId?: string | null }
  ): Promise<T> => {
    const runTimePin = options?.expectedServiceAccountId ?? null;
    if (storedPin !== null && runTimePin !== null && runTimePin !== storedPin) {
      throw createTaskRunError(
        Boom.forbidden(
          'The expected service account differs from the one the task was scheduled with.'
        ),
        TaskErrorSource.USER
      );
    }
    const expectedServiceAccountId = storedPin ?? runTimePin;

    let entered = false;
    try {
      return await definitionRunAs.withScopedRequest(
        {
          workloadType,
          workloadId,
          spaceId,
          ...(expectedServiceAccountId !== null ? { expectedServiceAccountId } : {}),
        },
        (request) => {
          entered = true;
          return fn(request);
        }
      );
    } catch (error) {
      if (entered || !(error instanceof Error)) {
        throw error;
      }
      throw createTaskRunError(error, getErrorSourceBeforeEntry(error));
    }
  },
});
