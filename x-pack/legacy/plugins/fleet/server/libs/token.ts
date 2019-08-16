/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TokenVerificationResponse } from './adapters/tokens/adapter_types';

export class TokenLib {
  public async verify(token: any): Promise<TokenVerificationResponse> {
    throw new Error('Not implemented');
  }

  public async generateAccessToken(token: any): Promise<string> {
    throw new Error('Not implemented');
  }
}
