/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';

export class HttpService {
  private client: HttpSetup | undefined;

  public setup(httpClient: HttpSetup): void {
    this.client = httpClient;
  }

  public get httpClient(): HttpSetup {
    if (!this.client) {
      throw new Error('Http service has not be initialized. Client is missing.');
    }
    return this.client;
  }
}

export const httpService = new HttpService();
