/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Base for typed SML errors — routes map subclasses to specific HTTP statuses. */
export class SmlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}
