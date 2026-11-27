/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The memory to revise is missing, forgotten, or belongs to another user or space. */
export class SessionMemoryNotFoundError extends Error {
  constructor(id: string) {
    super(`Session memory '${id}' not found`);
    this.name = 'NotFound';
  }
}
