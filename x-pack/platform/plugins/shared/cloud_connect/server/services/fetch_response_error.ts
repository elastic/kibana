/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class FetchResponseError extends Error {
  public readonly status: number;
  public readonly data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'FetchResponseError';
    this.status = status;
    this.data = data;
  }
}

export const isFetchResponseError = (error: unknown): error is FetchResponseError =>
  error instanceof FetchResponseError;
