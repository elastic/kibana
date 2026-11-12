/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isHttpFetchError } from '@kbn/core-http-browser';

/**
 * A `rawResponse` request leaves the body of a failed response unread, so the error has no
 * server message. Reads the JSON body into the error, so the user sees why the request failed.
 */
export const withErrorBody = async <T>(request: Promise<T>): Promise<T> => {
  try {
    return await request;
  } catch (error) {
    if (!isHttpFetchError(error)) throw error;
    const { response, body: readBody } = error;
    const isBodyUnread = readBody === undefined || readBody === null;
    if (!isBodyUnread || !response || response.bodyUsed) throw error;
    const body: unknown = await response
      .clone()
      .json()
      .catch(() => undefined);
    throw body === undefined ? error : Object.assign(error, { body });
  }
};
