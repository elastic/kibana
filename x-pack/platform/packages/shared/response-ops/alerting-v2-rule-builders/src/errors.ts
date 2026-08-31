/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Thrown when validated `builder_fields` still cannot produce a query — in
 * practice an ES|QL fragment (a filter or an evaluation expression) that a
 * bounded schema accepts as a string but the parser rejects.
 *
 * Generation fails loudly rather than dropping the offending clause: silently
 * discarding a `WHERE` would widen the rule to match rows the author excluded.
 */
export class BuilderQueryGenerationError extends Error {
  constructor(message: string, public readonly path?: string) {
    super(message);
    this.name = 'BuilderQueryGenerationError';
  }
}
