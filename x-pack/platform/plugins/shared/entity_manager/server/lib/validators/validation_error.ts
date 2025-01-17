/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface ErrorOptions {
  statusCode?: number;
}

export class AssetsValidationError extends Error {
  public statusCode: number;

  constructor(message: string, { statusCode = 400 }: ErrorOptions = {}) {
    super(message);
    this.name = 'AssetsValidationError';
    this.statusCode = statusCode;
  }
}
