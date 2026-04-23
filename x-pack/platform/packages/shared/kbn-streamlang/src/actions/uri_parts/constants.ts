/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Runtime constants for the `uri_parts` Streamlang action.
 *
 * Per-action runtime metadata (default target, sub-field lists, success
 * signal for `remove_if_successful`) lives under `src/actions/<action>/`
 * alongside the global `src/actions/action_metadata.ts`. Consumed by the
 * ES|QL transpiler and the validation layer.
 *
 * The `UriPartsProcessor` interface and `uriPartsProcessorSchema` remain in
 * `types/processors/index.ts` with every other processor's contract.
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
 * Per the ES|QL URI_PARTS csv-spec tests (elasticsearch PR #140004):
 *  - `testInvalidUri`: a non-parseable input (e.g. `"not a valid uri"`) emits
 *    a warning and nulls every output column.
 *  - `testNoSchemeUri`: a relative URI such as `/app/login?session=expired`
 *    parses successfully — `path` and `query` are populated even though
 *    `scheme` and `domain` are null and no warning is emitted.
 *
 * The only documented failure mode that produces null everywhere is the
 * invalid-URI case. Therefore the correct "parse succeeded" signal is
 * "at least one sub-field is non-null", which must OR across all of them
 * because relative URIs can legitimately leave scheme/domain null.
 *
 * This list is consumed by `remove_if_successful` to build that OR
 * predicate. Derived sub-fields (`username`/`password` are extracted from
 * `user_info`; `extension` from `path`) are excluded since checking the
 * root they derive from is equivalent and keeps the predicate shorter.
 *
 * @see https://www.elastic.co/docs/reference/query-languages/esql/commands/uri-parts
 * @see https://github.com/elastic/elasticsearch/pull/140004
 */
export const URI_PARTS_SUCCESS_SUBFIELDS = [
  'scheme',
  'domain',
  'path',
  'query',
  'fragment',
  'user_info',
  'port',
] as const;
