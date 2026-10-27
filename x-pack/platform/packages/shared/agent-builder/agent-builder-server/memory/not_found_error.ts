/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The memory does not exist, or belongs to another user. The two are deliberately indistinguishable. */
export class ShortTermMemoryNotFoundError extends Error {
  constructor(id: string) {
    super(`Short-term memory '${id}' not found.`);
    this.name = 'ShortTermMemoryNotFoundError';
  }
}
