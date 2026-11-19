/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandlerWrapper } from '@kbn/core-http-server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import type { KibanaServerError } from '@kbn/kibana-utils-plugin/common';
import type { Logger } from '@kbn/logging';
import type { RegionPolicyConflictAttributes } from '../../common/types';
import { isRegionPolicyConflictAttributes } from '../../common/type_guards';

function isKibanaServerError(error: unknown): error is KibanaServerError {
  const isObject = typeof error === 'object' && error !== null;
  if (!isObject) {
    return false;
  }
  return 'statusCode' in error && 'message' in error;
}

const getEsErrorBody = (body: unknown): unknown => {
  if (body === null || typeof body !== 'object') return undefined;
  if (!('error' in body)) return undefined;
  return body.error;
};

const getConflictAttributes = (body: unknown): RegionPolicyConflictAttributes | undefined => {
  const esError = getEsErrorBody(body);
  if (!isRegionPolicyConflictAttributes(esError)) return undefined;
  return {
    denied_endpoint_ids: esError.denied_endpoint_ids,
    referencing_pipelines: esError.referencing_pipelines,
    referencing_indexes: esError.referencing_indexes,
  };
};

export const errorHandler: (logger: Logger) => RequestHandlerWrapper = (logger) => (handler) => {
  return async (context, request, response) => {
    try {
      return await handler(context, request, response);
    } catch (e) {
      logger.error(e);
      if (SavedObjectsErrorHelpers.isSavedObjectsClientError(e)) {
        return response.customError({
          statusCode: e.output.statusCode,
          body: e.message,
        });
      }
      if (isResponseError(e)) {
        const statusCode = e.statusCode ?? 500;
        const message: string = e.body?.error?.reason ?? e.message;
        const attributes = statusCode === 409 ? getConflictAttributes(e.body) : undefined;
        if (attributes) {
          return response.customError({ statusCode, body: { message, attributes } });
        }
        return response.customError({ statusCode, body: { message } });
      }
      if (isKibanaServerError(e)) {
        return response.customError({ statusCode: e.statusCode, body: e.message });
      }
      throw e;
    }
  };
};
