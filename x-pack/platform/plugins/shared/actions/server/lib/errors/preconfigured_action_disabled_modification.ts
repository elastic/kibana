/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaResponseFactory } from '@kbn/core/server';
import { ErrorThatHandlesItsOwnResponse } from './types';

export type PreconfiguredActionDisabledFrom = 'update' | 'delete';

export class PreconfiguredActionDisabledModificationError
  extends Error
  implements ErrorThatHandlesItsOwnResponse
{
  public readonly disabledFrom: PreconfiguredActionDisabledFrom;

  constructor(message: string, disabledFrom: PreconfiguredActionDisabledFrom) {
    super(message);
    this.disabledFrom = disabledFrom;
  }

  public sendResponse(res: KibanaResponseFactory) {
    return res.badRequest({ body: { message: this.message } });
  }
}
