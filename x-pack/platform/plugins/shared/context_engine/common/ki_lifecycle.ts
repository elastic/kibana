/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Knowledge Indicator lifecycle flags. These live under the KI's `attributes` object rather than as
 * top-level fields: `attributes` is `flattened` in the shared `ai-index@mappings` template, so
 * arbitrary lifecycle keys are accepted on every AI index without declaring bespoke mappings that
 * could conflict on a long-lived index. It is also the convention the KI-automation skill already
 * documents for `expires_at`, `confidence`, and `excluded`.
 */

/** Marks a KI as present but skipped by agents — how a removal is recorded, since KIs are never deleted. */
export const KI_EXCLUDED_ATTRIBUTE = 'excluded';

/** When the KI was excluded, as an ISO-8601 string. */
export const KI_EXCLUDED_AT_ATTRIBUTE = 'excluded_at';

/** Why the KI was excluded, for anyone who finds it later and wonders. */
export const KI_EXCLUDED_REASON_ATTRIBUTE = 'excluded_reason';

/**
 * ES|QL predicate that keeps only KIs an agent should still see.
 *
 * `flattened` subfields are not addressable as columns, so the value has to be pulled out with
 * `FIELD_EXTRACT`, which yields `null` when the key is absent — including on an index where no
 * document has ever carried it. That makes the clause safe to append to any query whose target maps
 * `attributes`. It is *not* safe when the target does not map `attributes` at all (a strict-mapped
 * AI index such as the Agent Builder SML index): ES|QL then rejects the whole query with
 * `Unknown column [attributes]`, so callers that may hit such an index must fall back to the
 * unfiltered query — see `isEsqlUnknownColumnError`.
 */
export const KI_NOT_EXCLUDED_ESQL_PREDICATE = `FIELD_EXTRACT(attributes, "${KI_EXCLUDED_ATTRIBUTE}") IS NULL`;
