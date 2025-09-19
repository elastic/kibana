/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosError } from 'axios';
import { createTaskRunError, TaskErrorSource } from '@kbn/task-manager-plugin/server';
import type { ErrorCategorizationOverrides } from '../types';

export const httpResponseUserErrorCodes = [
  401, 402, 403, 407, 409, 412, 413, 417, 422, 423, 429, 451,
];

/**
 * Categorizes errored actions HTTP requests against external systems, creating user errors based
 * on the status code of the response and any overrides provided.
 */
export const handleActionHttpUserErrors = <T = unknown, D = unknown>(
  error: AxiosError<T, D>,
  overrides?: ErrorCategorizationOverrides
) => {
  const statusCode = error.response?.status;
  if (error.response && statusCode != null) {
    if (overrides?.[statusCode] === 'user' || httpResponseUserErrorCodes.includes(statusCode)) {
      throw createTaskRunError(error, TaskErrorSource.USER);
    }
  }
};
