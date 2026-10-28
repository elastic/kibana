/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Absolute maximum character count for any single string in a builder type's
 * `builderFieldsSchema`, checked at `registerBuilderType` time.
 *
 * This is an absolute ceiling, not a tuned bound. Which bound is *safe* for a
 * given leaf is a property of that leaf's mapping (keyword sub-fields are held
 * at or below `KEYWORD_SUB_FIELD_IGNORE_ABOVE` by the total-mapping check;
 * text sub-fields carry no length limit from Elasticsearch). The figure matches
 * what the artifact surface already passes through the same bounded-schema walk
 * (`MAX_ARTIFACT_STRING_LENGTH`), so the mechanism needs no change — only the
 * number does.
 */
export const MAX_BUILDER_FIELDS_STRING_LENGTH = 65_536;
export const MAX_BUILDER_FIELDS_ARRAY_ITEMS = 64;

/**
 * Ceiling for the worst-case byte size implied by a builder type's
 * `builderFieldsSchema`, checked at `registerBuilderType` time.
 *
 * Set to half the default request payload (`server.maxPayload`, one megabyte),
 * which leaves room for the long text bounds (note and setup) that the
 * detection rule schema raises above the old 8,192-character limit. A route
 * that accepts a one-megabyte body can therefore hold the whole builder-fields
 * budget twice over, with no risk of a request being rejected for size before
 * the schema even parses it.
 */
export const MAX_BUILDER_FIELDS_BYTES = 524_288;

/**
 * The `ignore_above` threshold of the `metadata.builder_fields` flattened
 * container. Strings stored in builder_fields whose values exceed this length
 * are stored but silently unsearchable as keywords. Shared between:
 *
 * - `rule_mappings.ts` (the static saved-object mapping definition)
 * - `from_builder_fields_manifest.ts` (mappings_addition in model versions)
 *
 * Both must agree byte-for-byte so core's startup consistency check
 * passes automatically.
 *
 * Ref: builder-type-registration-redesign.md "Assembling the saved-object type"
 */
export const BUILDER_FIELDS_IGNORE_ABOVE = 4096;
