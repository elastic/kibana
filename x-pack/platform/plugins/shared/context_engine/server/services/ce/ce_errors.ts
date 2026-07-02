/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Re-export the CE error types.
 *
 * The concrete classes live one-per-file under `./errors/*` so the
 * `max-classes-per-file` lint stays clean. Callers should keep
 * importing from `./ce_errors` for stability — refactoring this
 * barrel into individual leaf imports would touch every consumer for
 * no behavioural benefit.
 */
export {
  CeError,
  CeResultWindowExceededError,
  CeAuthzEnumerationIncompleteError,
  CeCorpusTooLargeError,
  CeUnregisteredTypeError,
} from './errors';
