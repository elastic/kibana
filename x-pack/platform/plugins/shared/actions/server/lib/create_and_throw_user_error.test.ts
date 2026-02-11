/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosError } from 'axios';
import { createAndThrowUserError, httpResponseUserErrorCodes } from './create_and_throw_user_error';
import { getErrorSource, TaskErrorSource } from '@kbn/task-manager-plugin/server/task_running';

describe('createAndThrowUserError', () => {
  it.each(httpResponseUserErrorCodes)(
    'should throw a user error for %s error responses',
    (statusCode) => {
      const error = {
        response: {
          status: statusCode,
        },
      } as AxiosError;
      try {
        createAndThrowUserError(error);
      } catch (e) {
        expect(getErrorSource(e)).toEqual(TaskErrorSource.USER);
      }
    }
  );

  it('should not throw a user error for non-user error responses', () => {
    const error = {
      response: {
        status: 500,
      },
    } as AxiosError;
    expect(() => createAndThrowUserError(error)).not.toThrow();
  });
});
