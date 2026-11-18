/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Context Engine is turned off in the space. */
export class ContextEngineDisabledError extends Error {
  constructor(message = 'Context Engine is not enabled in this space.') {
    super(message);
    this.name = 'ContextEngineDisabledError';
  }
}
