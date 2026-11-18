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
  /**
   * A case write's `customFields` could not be mirrored into `extended_fields`
   * because the link between a configured v1 custom field and its v2 field
   * definition is malformed (duplicate `legacyKey` claims, a type mismatch, or
   * unparseable definition YAML). The write is rejected with a 400 carrying
   * this code rather than guessing a storage key.
   */
  FIELD_LINKAGE_MALFORMED: 'field_linkage_malformed',
  /**
   * One create/update request explicitly supplied both representations of the
   * same linked field (`customFields` and `extended_fields`) with semantically
   * different values. There is no meaningful "last" within one request, so the
   * write is rejected with a 400 carrying this code instead of silently
   * choosing a side.
   */
  FIELD_REPRESENTATIONS_CONFLICT: 'field_representations_conflict',
  /**
   * A merge was refused before writing anything: a field the cases hold different values for has
   * no value in the request, a value is invalid or a required field is empty, or a kind of
   * attachment is over its destination limit. The 400 lists every conflict and limit.
   */
  MERGE_BLOCKED: 'merge_blocked',
} as const;

export type CasesApiErrorCode = (typeof CASES_API_ERROR_CODES)[keyof typeof CASES_API_ERROR_CODES];

/** `attributes` payload for `field_identity_immutable` (HTTP 409). */
export interface FieldIdentityImmutableErrorAttributes {
  code: typeof CASES_API_ERROR_CODES.FIELD_IDENTITY_IMMUTABLE;
  changed: Array<'name' | 'type'>;
}

/** `attributes` payload for `field_linkage_malformed` (HTTP 400). */
export interface FieldLinkageMalformedErrorAttributes {
  code: typeof CASES_API_ERROR_CODES.FIELD_LINKAGE_MALFORMED;
  fields: Array<{
    /** The v1 custom field key whose linkage is broken. */
    key: string;
    /**
     * `ambiguous_name_match` and `capacity` are configure-time-only reasons —
     * they can only be reported when a new definition would need to be
     * created for a not-yet-linked key, never for an already-resolved link.
     */
    reason:
      | 'duplicate_legacy_key'
      | 'type_mismatch'
      | 'unparseable_definition'
      | 'ambiguous_name_match'
      | 'capacity';
  }>;
}

/** `attributes` payload for `field_representations_conflict` (HTTP 400). */
export interface FieldRepresentationsConflictErrorAttributes {
  code: typeof CASES_API_ERROR_CODES.FIELD_REPRESENTATIONS_CONFLICT;
  /** Immutable v2 field-definition names only — never values. */
  fields: string[];
}

/**
 * A field the merge cannot decide on its own. `key` names the custom field key or the template
 * field storage key for `customFields` and `extendedFields`.
 */
export interface MergeBlockedConflict {
  field:
    | 'title'
    | 'description'
    | 'severity'
    | 'category'
    | 'connector'
    | 'template'
    | 'customFields'
    | 'extendedFields';
  key?: string;
  label?: string;
  reason: 'differentValues' | 'invalidValue' | 'required';
  message?: string;
}

/** A destination limit the merge would exceed, with how much has to be left out. */
export interface MergeBlockedLimit {
  kind: 'alerts' | 'observables' | 'other' | 'tags' | 'assignees' | 'description';
  max: number;
  total: number;
  overBy: number;
}

/** `attributes` payload for `merge_blocked` (HTTP 400). */
export interface MergeBlockedErrorAttributes {
  code: typeof CASES_API_ERROR_CODES.MERGE_BLOCKED;
  conflicts: MergeBlockedConflict[];
  limits: MergeBlockedLimit[];
}

/**
 * Union of every typed error-attributes shape Cases serializes. Extend this
 * union when introducing a new machine-readable error code.
 */
export type CasesApiErrorAttributes =
  | FieldIdentityImmutableErrorAttributes
  | FieldLinkageMalformedErrorAttributes
  | FieldRepresentationsConflictErrorAttributes
  | MergeBlockedErrorAttributes;

const ALL_ERROR_CODES: readonly string[] = Object.values(CASES_API_ERROR_CODES);

export const isCasesApiErrorAttributes = (value: unknown): value is CasesApiErrorAttributes =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { code?: unknown }).code === 'string' &&
  ALL_ERROR_CODES.includes((value as { code: string }).code);
