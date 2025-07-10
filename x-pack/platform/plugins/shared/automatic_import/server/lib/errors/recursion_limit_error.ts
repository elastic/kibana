/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaResponseFactory } from '@kbn/core/server';
import { ErrorThatHandlesItsOwnResponse } from './types';

export class RecursionLimitError extends Error implements ErrorThatHandlesItsOwnResponse {
  private readonly errorCode: string;

  constructor(message: string, errorCode: string) {
    super(message);
    this.errorCode = errorCode;
  }

  public sendResponse(res: KibanaResponseFactory) {
    return res.badRequest({
      body: { message: this.message, attributes: { errorCode: this.errorCode } },
    });
  }
}
