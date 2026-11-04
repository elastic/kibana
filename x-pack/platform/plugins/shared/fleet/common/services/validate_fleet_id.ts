/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isUnsafeId } from '@kbn/human-readable-id';

import { FleetError } from '../errors';

// Characters with no legitimate use in Fleet saved object IDs that could act
// as script metacharacters if an ID were ever interpolated into a script context.
const PAINLESS_UNSAFE_CHARS_RE = /["';\\()]/;

/**
 * Throws a FleetError if the id contains path separators, traversal sequences,
 * prototype-pollution keys, Painless script metacharacters, is empty, or
 * exceeds 255 characters. Only call on create paths so pre-existing stored IDs
 * continue to function.
 */
export const validateFleetSavedObjectId = (value: string | undefined): void => {
  if (value === undefined) return;
  if (isUnsafeId(value) || PAINLESS_UNSAFE_CHARS_RE.test(value)) {
    throw new FleetError(
      `id is not valid: must be 1–255 characters and must not contain path separators ("/"), traversal sequences (".."), reserved keys ("__proto__", "constructor", "prototype"), or script-injection characters (", ', ;, \\, (, )).`
    );
  }
};

/**
 * Returns true if the id contains a path-traversal segment (`..`) or a NUL
 * character. Unlike `isUnsafeId`, a bare `/` is allowed because package
 * policy input and stream ids legitimately embed the input type (e.g.
 * `cloudbeat/cis_k8s-...`). Only whole `/`- or `\`-separated segments equal to
 * `..` escape a parent directory, so substrings such as `foo..bar` are safe.
 */
export const isPathTraversalId = (value: string): boolean => {
  if (value.includes('\0')) return true;
  return value.split(/[/\\]/).some((segment) => segment === '..');
};

const PATH_TRAVERSAL_ID_ERROR =
  'id is not valid: must not contain path traversal sequences ("..") or null characters';

/**
 * Throws a FleetError if the id contains a path-traversal segment. Use for
 * package policy input and stream ids, which may legitimately contain `/` and
 * so cannot use `validateFleetSavedObjectId`. Only call on create/update
 * paths so pre-existing stored ids continue to function.
 *
 * Accepts `unknown` because some id sources (e.g. `input.config.id.value`) are
 * schema-typed as `any`. A missing value (`undefined`/`null`) is treated as
 * "no id set"; any other non-string is rejected as an invalid id rather than
 * crashing the string check.
 */
export const validateNoPathTraversalId = (value: unknown): void => {
  if (value === undefined || value === null) return;
  if (typeof value !== 'string') {
    throw new FleetError(PATH_TRAVERSAL_ID_ERROR);
  }
  if (isPathTraversalId(value)) {
    throw new FleetError(PATH_TRAVERSAL_ID_ERROR);
  }
};

/**
 * `@kbn/config-schema` `validate`-style predicate: returns an error message
 * when the id contains a path-traversal segment, otherwise `undefined`.
 */
export const validateNoPathTraversalIdSchema = (value: string): string | undefined => {
  if (isPathTraversalId(value)) {
    return PATH_TRAVERSAL_ID_ERROR;
  }
};
