/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { CloudApiKeyNotSupportedError } from './cloud_api_key_not_supported_error';
export { UiamUnavailableError } from './uiam_unavailable_error';

export const errorDetails = (err: unknown): { message: string; stack?: string } => ({
  message: err instanceof Error ? err.message : String(err),
  stack: err instanceof Error ? err.stack : undefined,
});
