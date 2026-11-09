/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, KibanaResponseFactory } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import { ApiKeysDisabledError } from './api_keys';
import { TaskRunnerServiceError } from './service_error';

/**
 * Maps a service status to the status Kibana returns. Problems with Kibana's own
 * configuration (shared secret, project) become 502, so the browser never sees a 401
 * that would log the user out.
 */
const toKibanaStatus = ({ statusCode, code }: TaskRunnerServiceError): number => {
  switch (code) {
    case 'not_configured':
      return 500;
    case 'unreachable':
    case 'bad_response':
      return 502;
    case 'timeout':
      return 504;
    case 'project_not_found':
      return 502;
  }
  if (statusCode === 400 || statusCode === 404 || statusCode === 501 || statusCode === 503) {
    return statusCode;
  }
  return 502;
};

const toKibanaMessage = (error: TaskRunnerServiceError): string => {
  if (error.statusCode === 401 || error.statusCode === 403) {
    return 'The task runner service rejected Kibana; check task_runner_poc.sharedSecret';
  }
  if (error.code === 'project_not_found') {
    return `${error.message}; check task_runner_poc.projectId`;
  }
  return error.message;
};

export const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** Turns an error from a route handler into a Kibana error response, or rethrows it. */
export const errorToResponse = (
  response: KibanaResponseFactory,
  error: unknown
): IKibanaResponse => {
  if (error instanceof TaskRunnerServiceError) {
    return response.customError({
      statusCode: toKibanaStatus(error),
      body: { message: toKibanaMessage(error), attributes: { code: error.code } },
    });
  }
  if (error instanceof ApiKeysDisabledError) {
    return response.customError({
      statusCode: 500,
      body: { message: error.message, attributes: { code: 'api_keys_disabled' } },
    });
  }
  if (isResponseError(error)) {
    return response.customError({
      statusCode: error.statusCode ?? 500,
      body: { message: error.message, attributes: { code: 'elasticsearch_error' } },
    });
  }
  throw error;
};
