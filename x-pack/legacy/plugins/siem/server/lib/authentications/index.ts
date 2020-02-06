/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AuthenticationsData } from '../../graphql/types';
import {
  FrameworkRequest,
  RequestOptionsPaginated,
  MatrixHistogramRequestOptions,
} from '../framework';

import { AuthenticationsAdapter } from './types';
import { AuthenticationsOverTimeData } from '../../../public/graphql/types';

export class Authentications {
  constructor(private readonly adapter: AuthenticationsAdapter) {}

  public async getAuthentications(
    req: FrameworkRequest,
    options: RequestOptionsPaginated
  ): Promise<AuthenticationsData> {
    return this.adapter.getAuthentications(req, options);
  }

  public async getAuthenticationsOverTime(
    req: FrameworkRequest,
    options: MatrixHistogramRequestOptions
  ): Promise<AuthenticationsOverTimeData> {
    return this.adapter.getAuthenticationsOverTime(req, options);
  }
}
