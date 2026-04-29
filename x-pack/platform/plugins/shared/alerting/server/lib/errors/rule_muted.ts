/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaResponseFactory } from '@kbn/core/server';
import type { ErrorThatHandlesItsOwnResponse } from './types';

export class RuleMutedError extends Error implements ErrorThatHandlesItsOwnResponse {
  constructor(message: string) {
    super(message);
  }

  public sendResponse(res: KibanaResponseFactory) {
    return res.badRequest({ body: { message: this.message } });
  }
}
