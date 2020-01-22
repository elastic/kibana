/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpSetup } from '../../../../../../../src/core/public';

class HttpService {
  private client: any;

  public init(httpClient: HttpSetup): void {
    this.client = httpClient;
  }

  public get httpClient(): HttpSetup {
    return this.client;
  }
}

export const httpService = new HttpService();
