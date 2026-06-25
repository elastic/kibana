/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Base class for typed SML service errors. Subclasses are expected/handled
 * outcomes (routes map them to specific HTTP statuses), distinct from
 * unexpected ES failures which propagate as 500s. The shared constructor sets
 * `name` from the concrete class so stack traces and `instanceof` checks read
 * correctly.
 *
 * Each subclass lives in its own file (rather than co-located with the base)
 * so the `max-classes-per-file` lint stays clean. The `./index` barrel
 * re-exports all of them — callers should import from there or from the
 * `../sml_errors` re-export, never reach into a leaf file directly.
 */
export class SmlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}
