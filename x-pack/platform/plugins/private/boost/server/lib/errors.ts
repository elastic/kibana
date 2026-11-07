/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, KibanaResponseFactory } from '@kbn/core/server';

/**
 * An error that routes return with its status code and message: a client error, or a timeout the
 * prototype simulates.
 */
export class BoostRequestError extends Error {
  constructor(public readonly statusCode: 400 | 404 | 409 | 504, message: string) {
    super(message);
  }
}

/** Responds with a client error's status code and message, rethrowing any other error. */
export const toErrorResponse = (response: KibanaResponseFactory, error: Error): IKibanaResponse => {
  if (error instanceof BoostRequestError) {
    return response.customError({ statusCode: error.statusCode, body: { message: error.message } });
  }
  throw error;
};
