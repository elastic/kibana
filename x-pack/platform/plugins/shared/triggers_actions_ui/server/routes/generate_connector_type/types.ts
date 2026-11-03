/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GenerateConnectorTypeErrorReason } from '../../../common/connector_type_generation';

export interface FetchedDocument {
  url: string;
  contentType: string;
  text: string;
}

export class GenerateConnectorTypeError extends Error {
  constructor(
    public readonly reason: GenerateConnectorTypeErrorReason,
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'GenerateConnectorTypeError';
  }
}

export const isGenerateConnectorTypeError = (error: unknown): error is GenerateConnectorTypeError =>
  error instanceof GenerateConnectorTypeError;
