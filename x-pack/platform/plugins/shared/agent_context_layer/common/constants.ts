/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const internalApiPath = '/internal/agent_context_layer';
export const smlSearchPath = `${internalApiPath}/sml/_search`;
export const smlBasePath = `${internalApiPath}/sml`;
/**
 * Path for GET/PUT/DELETE of a single SML origin.
 *
 * The path uses **both** the SML `type` and the `origin_id` because
 * the storage's canonical key is the compound `origin.uri =
 * ${type}://${originId}`. A `(type, originId)` pair is the smallest
 * thing the system can address unambiguously — two different SML
 * types can legitimately reuse the same bare `origin_id` (e.g. a lens
 * id and a dashboard id can collide). An earlier design used
 * `/sml/{originId}` and assumed the bare id was globally unique; that
 * assumption never held, and the resulting query path (`term:
 * { origin_id }`) hit an unmapped field — silent zero-result reads
 * that masked every guard the per-origin routes apply.
 *
 * GET returns every chunk written under the origin (workflow steps
 * can produce more than one). PUT/DELETE both operate on the origin
 * as a whole and route through
 * {@link SmlIndexer.indexAttachment} / `deleteAttachment` so
 * permissions and ingestion-method semantics stay consistent with
 * every other write path.
 */
export const smlByTypeAndOriginIdPath = `${smlBasePath}/{type}/{originId}`;
export const smlAutocompletePath = `${internalApiPath}/sml/_autocomplete`;

/**
 * Hard upper bound on the length of an SML `origin_id` (URL path
 * parameter on every per-origin route — GET / PUT / DELETE — and the
 * value the workflow step's content-mode also passes through).
 *
 * 512 is generous enough for every documented producer (saved-object
 * UUIDs, prefixed connector ids, `corpus_entry:<sha256>` style keys)
 * while keeping the URL well below the 2 KB per-segment line most
 * intermediaries (load balancers, proxies) accept without complaining.
 * Mirrors the workflow step schema's own `MAX_SML_IDENTIFIER_LENGTH`
 * envelope but is centralised here so every route shares the same
 * cap — a route accepting a longer value than the workflow step would
 * be a silent inconsistency.
 */
export const MAX_SML_ORIGIN_ID_LENGTH = 512;

/**
 * Maximum length of the SML `type` identifier in the HTTP body.
 *
 * Matches the workflow step schema's `MAX_SML_IDENTIFIER_LENGTH` so
 * both producers agree on the envelope a registered SML type can
 * occupy. Beyond syntactic regex validation, this length cap is the
 * second line of defense against unbounded namespace identifiers from
 * arbitrary HTTP clients.
 */
export const MAX_SML_TYPE_LENGTH = 256;

/**
 * Hard upper bound on the SML chunk `title` field.
 *
 * 1024 chars is plenty for human-readable names — most real titles
 * live well below 200 — and aligns with the workflow step's content
 * schema so HTTP and workflow producers share a consistent envelope.
 */
export const MAX_SML_TITLE_LENGTH = 1024;

/**
 * Hard upper bound on the SML chunk `content` field.
 *
 * 50_000 chars (~50 KB) is in line with the workflow step's content
 * schema and gives plenty of room for chunked content while keeping
 * single-document footprint predictable. Without a cap a client could
 * push arbitrary amounts of text per request and bloat the index.
 */
export const MAX_SML_CONTENT_LENGTH = 50_000;

/**
 * Maximum length of a single tag and maximum number of tags per
 * document. Tags participate in OR-style filtering on list endpoints,
 * so a runaway tag count would inflate the query without adding
 * useful selectivity.
 */
export const MAX_SML_TAG_LENGTH = 100;
export const MAX_SML_TAGS_PER_DOCUMENT = 100;

/**
 * Maximum number of chunks the SML service will return for a single
 * origin (compound `(type, originId)`) from `findByOrigin` /
 * `findByOriginAcrossSpaces`.
 *
 * Used as the `size` of the per-origin lookup queries. ES capped at
 * 10_000 by default (`index.max_result_window`), but 1000 is the
 * working envelope we expect every legitimate producer to stay under:
 * the workflow step's content-mode batch is already bounded at 100
 * chunks per write, and `getSmlData` implementations return single
 * chunks per origin in practice. Beyond this limit the helpers log a
 * warning so operators can detect a producer that has gone off the
 * rails (or a typo collapsing many distinct origins into one). The
 * cross-space guard may miss chunks beyond this limit — see
 * `findByOriginAcrossSpaces` JSDoc.
 */
export const MAX_CHUNKS_PER_ORIGIN = 1000;
