/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AuthenticationsData } from '../../graphql/types';
import { FrameworkRequest, RequestOptions } from '../framework';

import { AuthenticationsAdapter } from './types';

export class Authentications {
  constructor(private readonly adapter: AuthenticationsAdapter) {}

  public async getAuthentications(
    req: FrameworkRequest,
    options: RequestOptions
  ): Promise<AuthenticationsData> {
    return await this.adapter.getAuthentications(req, options);
  }
}
