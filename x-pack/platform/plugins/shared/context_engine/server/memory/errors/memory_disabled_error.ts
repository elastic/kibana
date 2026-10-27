/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Memory, or Context Engine itself, is turned off. */
export class MemoryDisabledError extends Error {
  constructor(message = 'Context Engine memory is disabled.') {
    super(message);
    this.name = 'MemoryDisabledError';
  }
}
