/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class MemoryForbiddenError extends Error {
  constructor(message = 'You do not have permission to write Context Engine memory.') {
    super(message);
    this.name = 'MemoryForbiddenError';
  }
}
