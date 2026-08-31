/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Framework ceiling for any single string in a registered `builderFieldsSchema`,
 * checked against `maxLength` at `registerBuilderType` time.
 */
export const MAX_BUILDER_FIELDS_STRING_LENGTH = 8_192;

/**
 * Framework ceiling for any array's `maxItems` in a registered
 * `builderFieldsSchema`. Builder fields describe query structure — lists of
 * aggregations, conditions, group-by fields — so this sits well above the
 * artifact ceiling while still bounding how large a generated query can get.
 */
export const MAX_BUILDER_FIELDS_ARRAY_ITEMS = 64;

/**
 * Ceiling for the worst-case `builder_fields` size implied by a registered
 * schema.
 *
 * "Bytes" is an approximation: the walk charges `maxLength` characters per
 * string, so JSON escaping of non-ASCII values can serialize larger. This is a
 * registration-time guardrail for builder authors, not an exact runtime cap.
 */
export const MAX_BUILDER_FIELDS_BYTES = 262_144;
