/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Context Engine is turned off in the request's space (`contextEngine:enabled`). */
export class ContextEngineDisabledError extends Error {
  constructor() {
    super('Context Engine is turned off in this space.');
    this.name = 'ContextEngineDisabledError';
  }
}
