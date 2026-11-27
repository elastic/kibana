/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MEMORY_DISABLED_MESSAGE = 'Context Engine memory is turned off.';

/** Memory is turned off (`contextEngine:memoryEnabled`). */
export class MemoryDisabledError extends Error {
  constructor() {
    super(MEMORY_DISABLED_MESSAGE);
    this.name = 'MemoryDisabledError';
  }
}
