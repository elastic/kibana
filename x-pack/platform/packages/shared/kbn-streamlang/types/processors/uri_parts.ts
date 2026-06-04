/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Runtime constants for the `uri_parts` Streamlang processor.
 *
 * Colocated next to `uriPartsProcessorSchema` / `UriPartsProcessor` in
 * `types/processors/` because they define the shape of the processor's output
 * (default target, sub-field lists, success signal). Consumed by the ES|QL
 * transpiler, the validation layer, and the Streams UI form (which uses
 * `URI_PARTS_DEFAULT_TARGET` to pre-populate the target-prefix field so the
 * form's default matches the transpilers' fallback).
 *
 * Runtime values living under `types/` has precedent — see
 * `types/utils/grok_to_regex.ts` for grok pattern helpers and constants.
 */

/**
 * Default target prefix when `to` is omitted. Matches the Elasticsearch
 * `uri_parts` ingest processor default (`target_field: "url"`).
 */
export const URI_PARTS_DEFAULT_TARGET = 'url';

/**
 * String-valued sub-fields produced under the target prefix. Mirrors the
 * output columns of the ES|QL URI_PARTS command and the Elasticsearch
 * `uri_parts` ingest processor.
 *
 * @see https://www.elastic.co/docs/reference/query-languages/esql/commands/uri-parts
 * @see https://www.elastic.co/docs/reference/enrich-processor/uri-parts-processor
 */
export const URI_PARTS_STRING_SUBFIELDS = [
  'scheme',
  'domain',
  'fragment',
  'path',
  'query',
  'user_info',
  'username',
  'password',
  'extension',
] as const;

/**
 * Numeric sub-fields produced under the target prefix.
 */
export const URI_PARTS_NUMBER_SUBFIELDS = ['port'] as const;

/**
 * Sub-fields whose non-null value indicates a successful parse.
 *
 * Rationale for OR-ing over every output column (not just a subset):
 *
 *  - Per the ES|QL URI_PARTS csv-spec tests (elasticsearch PR #140004):
 *    - `testInvalidUri`: an unparseable input (e.g. `"not a valid uri"`)
 *      emits a warning and nulls every output column.
 *    - `testNoSchemeUri`: a relative URI such as
 *      `/app/login?session=expired` parses successfully — `path` and
 *      `query` are populated even though `scheme` and `domain` are null
 *      and no warning is emitted.
 *  - The only documented failure mode that produces null everywhere is
 *    the invalid-URI case. Therefore the correct "parse succeeded"
 *    signal is "at least one output column is non-null".
 *  - Derived sub-fields (`username`/`password` extracted from
 *    `user_info`; `extension` extracted from `path`) are logically
 *    redundant under current parser semantics — if the parent is null,
 *    the derived field must also be null — but OR-ing over every output
 *    column keeps the signal equivalent to "at least one output column
 *    is non-null" without relying on that unstated parser invariant,
 *    and makes the constant robust to any future change in how the
 *    parser populates derived fields.
 *
 * This list is consumed by `remove_if_successful` and by `keep_original`
 * in the ES|QL transpiler to build the success OR predicate.
 *
 * @see https://www.elastic.co/docs/reference/query-languages/esql/commands/uri-parts
 * @see https://www.elastic.co/docs/reference/enrich-processor/uri-parts-processor
 * @see https://github.com/elastic/elasticsearch/pull/140004
 */
export const URI_PARTS_SUCCESS_SUBFIELDS = [
  ...URI_PARTS_STRING_SUBFIELDS,
  ...URI_PARTS_NUMBER_SUBFIELDS,
] as const;
