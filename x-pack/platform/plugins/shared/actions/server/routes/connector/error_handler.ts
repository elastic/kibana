/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, KibanaResponseFactory } from '@kbn/core/server';
import {
  isResponseError as isElasticsearchResponseError,
  isUnauthorizedError,
  isNotFoundError,
} from '@kbn/es-errors';
import type { KibanaServerError } from '@kbn/kibana-utils-plugin/common';
import { identifyEsError } from '@kbn/task-manager-plugin/server/lib/identify_es_error';

function isKibanaServerError(error: unknown): error is KibanaServerError {
  return typeof error === 'object' && error !== null && 'statusCode' in error && 'message' in error;
}

/**
 * Default Connector routes error handler
 * @param res
 * @param error
 */
export const errorHandler = <E extends Error>(
  res: KibanaResponseFactory,
  error: E
): IKibanaResponse => {
  if (isKibanaServerError(error)) {
    const errorCausedBy = identifyEsError(error);
    if (isElasticsearchResponseError(error) && error.statusCode === 400) {
      return res.badRequest({
        body: {
          message: errorCausedBy.pop() ?? error.message,
        },
      });
    }

    if (isUnauthorizedError(error)) {
      return res.forbidden({ body: error });
    }

    if (isNotFoundError(error)) {
      return res.notFound({
        body: error,
      });
    }

    return res.customError({
      statusCode: error.statusCode,
      body: error.message,
    });
  }
  // Kibana CORE will take care of `500` errors when the handler `throw`'s, including logging the error
  throw error;
};
