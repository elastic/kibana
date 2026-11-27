/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Keyword fields that were added to the latest index mappings after that index shipped, each with
 * the `LATEST_INDEX_MAPPINGS_VERSION` that added it. A latest index created before that version
 * lacks the field until the startup migration has mapped it, so every query that names the field
 * must tolerate its absence (see `getUnmappedLatestFieldPlaceholders`).
 *
 * Add the field here when you bump the version for it; the extraction query and the entities grid
 * both read this list. Delete an entry once every install is past its version.
 */
export const LATEST_INDEX_ADDED_FIELDS = [{ field: 'user.entity.id', version: 1 }] as const;

/**
 * The `| EVAL <field> = TO_STRING(null)` steps to put before a `LOOKUP JOIN` on the latest index,
 * one per field of `LATEST_INDEX_ADDED_FIELDS`, or only those named in `fields` when it is given.
 * `SET unmapped_fields="nullify"` does not reach a lookup index's column once a `STATS` or `KEEP`
 * precedes the join; where the lookup index does map the field, its value replaces the null.
 * Keyword fields only: the placeholder is a null string. A listed field must not be computed or
 * kept by the consumer's pipeline before the join, because the placeholder would overwrite it (the
 * extraction query is safe because a `STATS` precedes the join; the grid does not compute them).
 */
export const getUnmappedLatestFieldPlaceholders = (fields?: readonly string[]): string[] =>
  LATEST_INDEX_ADDED_FIELDS.filter(({ field }) => !fields || fields.includes(field)).map(
    ({ field }) => `| EVAL ${field} = TO_STRING(null)`
  );
