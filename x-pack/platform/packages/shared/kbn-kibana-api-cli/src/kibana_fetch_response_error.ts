/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class FetchResponseError extends Error {
  public readonly statusCode: number;
  constructor(public response: globalThis.Response, content?: string) {
    super(content ?? response.statusText);
    this.statusCode = response.status;
    this.name = 'FetchResponseError';
  }
}
