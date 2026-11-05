/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A UIAM key is required, but UIAM is disabled or the request has no UIAM credentials. */
export class UiamUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UiamUnavailableError';
  }
}
