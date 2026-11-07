/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Thrown when the request authenticates with a raw Cloud API key, which can be
 * neither reused nor exchanged for a Kibana API key. Callers map it to their
 * own user-facing error and code.
 */
export class CloudApiKeyNotSupportedError extends Error {
  constructor(public readonly keyName: string) {
    super(`Cannot create API key "${keyName}" from a Cloud API key`);
    this.name = 'CloudApiKeyNotSupportedError';
  }
}
