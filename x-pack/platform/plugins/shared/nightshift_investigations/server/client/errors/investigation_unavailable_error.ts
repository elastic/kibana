/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class InvestigationUnavailableError extends Error {
  public readonly statusCode = 503;

  constructor(reason: string) {
    super(reason);
    this.name = 'InvestigationUnavailableError';
  }
}
