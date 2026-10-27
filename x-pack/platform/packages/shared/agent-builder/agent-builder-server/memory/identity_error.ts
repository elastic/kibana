/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The caller has no stable user id (for example an API key whose owner has no profile). */
export class ShortTermMemoryIdentityError extends Error {
  constructor() {
    super('Cannot store short-term memory without a stable user identity.');
    this.name = 'ShortTermMemoryIdentityError';
  }
}
