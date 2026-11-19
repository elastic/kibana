/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Secrets cannot be used in this Kibana, for example because no encryption key is set. */
export class SecretsUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecretsUnavailableError';
  }
}
