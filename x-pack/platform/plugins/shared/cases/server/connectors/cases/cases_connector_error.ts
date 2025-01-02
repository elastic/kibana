/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseError } from '../../common/error';

export class CasesConnectorError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);

    this.statusCode = statusCode;
  }
}

export const isCasesConnectorError = (error: unknown): error is CasesConnectorError =>
  error instanceof CasesConnectorError;

export const isCasesClientError = (error: unknown): error is CaseError =>
  error instanceof CaseError;
