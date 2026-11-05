/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The caller presented a Cloud (UIAM) API key, but UIAM isn't enabled. A client error. */
export class CloudApiKeyNotSupportedError extends Error {
  constructor(subject: string) {
    super(
      `Cannot use a Cloud API key for ${subject}. Cloud API keys are only supported in serverless environments; use a project-scoped Elasticsearch API key instead.`
    );
    this.name = 'CloudApiKeyNotSupportedError';
  }
}
