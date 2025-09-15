/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosError } from 'axios';
import { handleActionHttpUserErrors, httpResponseUserErrorCodes } from './categorize_http_errors';
import { getErrorSource, TaskErrorSource } from '@kbn/task-manager-plugin/server/task_running';

describe('handleActionHttpUserErrors', () => {
  it.each(httpResponseUserErrorCodes)(
    'should throw a user error for %s error responses',
    (statusCode) => {
      const error = {
        response: {
          status: statusCode,
        },
      } as AxiosError;
      try {
        handleActionHttpUserErrors(error);
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
    expect(() => handleActionHttpUserErrors(error)).not.toThrow();
  });

  it('should mark overridden status code as user error', () => {
    const error = {
      response: {
        status: 499,
      },
    } as AxiosError;
    try {
      handleActionHttpUserErrors(error);
    } catch (e) {
      expect(getErrorSource(e)).toEqual(TaskErrorSource.USER);
    }
  });
});
