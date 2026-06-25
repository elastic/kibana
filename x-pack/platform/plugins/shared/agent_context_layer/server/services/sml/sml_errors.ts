/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable max-classes-per-file */

/**
 * Base class for typed SML service errors. Subclasses are expected/handled
 * outcomes (routes map them to specific HTTP statuses), distinct from
 * unexpected ES failures which propagate as 500s. The shared constructor sets
 * `name` from the concrete class so stack traces and `instanceof` checks read
 * correctly.
 */
export class SmlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Thrown when a list query asks for a window larger than the index's
 * `index.max_result_window` setting. Routes translate this to HTTP 400 so
 * callers see a clean error instead of a 500.
 */
export class SmlResultWindowExceededError extends SmlError {}

/**
 * Thrown when an `_terms_enum` enumeration of a permission field returns
 * `complete: false` (node error / timeout). A partial universe would
 * under-count the corpus's permission set and silently over-authorize the
 * subsequent search, so the search fails closed instead.
 */
export class SmlAuthzEnumerationIncompleteError extends SmlError {}

/**
 * Thrown when the number of distinct values for a permission field exceeds the
 * enumeration ceiling (`maxPages * pageSize`). Hitting this means the corpus
 * has grown beyond what the request-scoped pre-aggregation can safely
 * enumerate; the search fails closed rather than authorize against a truncated
 * universe.
 */
export class SmlCorpusTooLargeError extends SmlError {}

/**
 * Thrown when a write call (`indexAttachment` for `action: 'create'` /
 * `'update'`, in either origin or content mode) targets an
 * `attachmentType` that has no entry in the SML type registry.
 *
 * Centralised here so every write path produces the same error class
 * regardless of which surface the call arrived through — the HTTP PUT
 * route translates it to 400, the workflow step handler surfaces it as
 * a step `error` result, and direct internal callers see a typed throw
 * rather than a no-op silently dropping their write.
 *
 * `delete` paths intentionally do **not** raise this — cleanup must keep
 * working even when the plugin that originally registered the type is
 * disabled, or stale chunks become unreachable from every write path.
 */
export class SmlUnregisteredTypeError extends SmlError {}
