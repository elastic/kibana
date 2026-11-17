/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Parameters Elasticsearch accepts changing on a field that already exists.
 *
 * This is an allowlist rather than a list of dangerous parameters, because the dangerous
 * set is unbounded and reasoning about it is unreliable: `null_value`, `store` and `norms`
 * all look harmless and are all rejected. Anything absent here is refused.
 *
 * Every entry was observed against a live cluster. The pattern that explains it: a
 * parameter affecting what is written to disk is immutable, one affecting query time or
 * ingest leniency is not. That is why `analyzer` is refused while `search_analyzer` is
 * allowed.
 */
export const MUTABLE_PARAMETERS_BY_TYPE: Readonly<Record<string, readonly string[]>> = {
  keyword: ['ignore_above', 'eager_global_ordinals', 'split_queries_on_whitespace'],
  text: ['search_analyzer', 'fielddata'],
  date: ['ignore_malformed'],
  long: ['coerce', 'ignore_malformed'],
  integer: ['coerce', 'ignore_malformed'],
  short: ['coerce', 'ignore_malformed'],
  byte: ['coerce', 'ignore_malformed'],
  double: ['coerce', 'ignore_malformed'],
  float: ['coerce', 'ignore_malformed'],
  ip: ['ignore_malformed'],
  flattened: ['depth_limit', 'ignore_above', 'split_queries_on_whitespace'],
};

/**
 * Keys that describe a field's shape rather than configure it, so a difference in them
 * is not a parameter change. `fields` and `properties` are walked recursively instead.
 */
export const STRUCTURAL_KEYS: readonly string[] = ['properties', 'fields', 'type'];

/**
 * Object- and mapping-level settings Elasticsearch accepts changing in place.
 * `dynamic` and `dynamic_templates` only affect fields that do not exist yet, which is
 * why they are safe; `meta` carries no indexing behaviour at all.
 */
export const MUTABLE_STRUCTURAL_SETTINGS: readonly string[] = [
  'dynamic',
  'dynamic_templates',
  'meta',
  '_meta',
  'copy_to',
  'path',
];

/**
 * Object-level settings Elasticsearch refuses to update. Named explicitly because they
 * fail with `mapper_exception` rather than `illegal_argument_exception`, so code that
 * matches only the latter misses them entirely.
 */
export const IMMUTABLE_STRUCTURAL_SETTINGS: readonly string[] = ['subobjects', 'enabled'];

/** Kibana's FieldMap carries these; they never reach an Elasticsearch mapping. */
export const NON_MAPPING_KEYS: readonly string[] = ['array', 'required'];

export const isMutableParameter = (fieldType: string | undefined, parameter: string): boolean => {
  if (fieldType === undefined) {
    // Without a declared type there is nothing to look up, so fail safe.
    return false;
  }
  return (MUTABLE_PARAMETERS_BY_TYPE[fieldType] ?? []).includes(parameter);
};
