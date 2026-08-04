/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Machine-readable error codes serialized in HTTP error responses under
 * `attributes.code`. Codes are lowercase snake_case by convention. They are a
 * public contract for API clients and the Cases UI — never rename or reuse one.
 */
export const CASES_API_ERROR_CODES = {
  /**
   * A field definition's `name` and (YAML) `type` are its persisted identity:
   * they determine the `${name}_as_${type}` storage key in case data and the
   * Cases analytics runtime field. Attempting to change either on an existing
   * definition is rejected with a 409 carrying this code.
   */
  FIELD_IDENTITY_IMMUTABLE: 'field_identity_immutable',
} as const;

export type CasesApiErrorCode = (typeof CASES_API_ERROR_CODES)[keyof typeof CASES_API_ERROR_CODES];

/** `attributes` payload for `field_identity_immutable` (HTTP 409). */
export interface FieldIdentityImmutableErrorAttributes {
  code: typeof CASES_API_ERROR_CODES.FIELD_IDENTITY_IMMUTABLE;
  changed: Array<'name' | 'type'>;
}

/**
 * Union of every typed error-attributes shape Cases serializes. Extend this
 * union when introducing a new machine-readable error code.
 */
export type CasesApiErrorAttributes = FieldIdentityImmutableErrorAttributes;

const ALL_ERROR_CODES: readonly string[] = Object.values(CASES_API_ERROR_CODES);

export const isCasesApiErrorAttributes = (value: unknown): value is CasesApiErrorAttributes =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { code?: unknown }).code === 'string' &&
  ALL_ERROR_CODES.includes((value as { code: string }).code);
