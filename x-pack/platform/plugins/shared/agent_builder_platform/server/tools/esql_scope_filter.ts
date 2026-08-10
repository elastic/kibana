/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { AI_INDEX_DEST_PREFIX } from '@kbn/context-engine-plugin/common/constants';

/** Keyword field carrying the space ids a document belongs to. See `sml_storage.ts`. */
const SPACES_FIELD = 'spaces';

/** Space id meaning "every space", the convention `checkItemsAccess` and `autocompleteSml` use. */
const ALL_SPACES = '*';

/** Every field a scope clause may reference. Probed in a single `field_caps` call. */
const SCOPED_FIELDS = [SPACES_FIELD] as const;

/** Elasticsearch's own prefix for the backing indices of a data stream. */
const DATA_STREAM_BACKING_PREFIX = '.ds-';

/**
 * Decide whether a concrete index sits in the AI index namespace.
 *
 * `context_engine` owns this namespace: it derives every destination name from
 * `AI_INDEX_DEST_PREFIX`, either as `ai-index-ds-<id>` for a data stream or `ai-index-idx-<id>` for
 * an index (see `getAiIndexDest`). `smlIndexName` in `sml_storage.ts` is one such destination. The
 * base prefix covers both forms, so it is the right thing to test.
 *
 * Field names alone cannot gate the scope clause. `spaces` is an ordinary English word, so an
 * unrelated index may well map a `spaces` field meaning something else entirely, and filtering it
 * by Kibana space ids would silently drop the caller's rows. The namespace is the real signal.
 *
 * `field_caps` reports concrete indices, so the name we see may not be the destination name itself:
 * a data stream's backing index is `.ds-<destination>-<date>-<generation>`, a rolled-over write
 * index behind an alias is `<destination>-000001` (what `StorageIndexAdapter` creates), and
 * cross-cluster search prefixes the cluster (`remote:<destination>`). All three have to be
 * recognised.
 */
const isAiIndex = (index: string): boolean => {
  const withoutCluster = index.slice(index.lastIndexOf(':') + 1);
  const destination = withoutCluster.startsWith(DATA_STREAM_BACKING_PREFIX)
    ? withoutCluster.slice(DATA_STREAM_BACKING_PREFIX.length)
    : withoutCluster;
  return destination.startsWith(AI_INDEX_DEST_PREFIX);
};

/**
 * Restrict results to documents belonging to the current space.
 *
 * The `must_not exists` arm is not a convenience. Elasticsearch also applies the ES|QL `filter` as
 * the `index_filter` during field resolution, so an index that cannot match the filter is dropped
 * from the query and its exclusive columns disappear from the response with no error. A query such
 * as `FROM ai-index-*` spans the SML index and other AI indices that do not map `spaces`; without
 * this arm those other indices would silently return nothing.
 *
 * The arm is also a fail-open for any individual document that lacks the field, which is why the
 * clause is only worth having while SML documents keep `spaces` mapped and populated.
 *
 * `terms` is the Query DSL equivalent of the `MV_CONTAINS(spaces, ?)` call in `buildSmlEsqlQuery`:
 * on a `keyword` array it matches when any value matches.
 */
const buildSpaceClause = (spaceId: string): QueryDslQueryContainer => ({
  bool: {
    minimum_should_match: 1,
    should: [
      { terms: { [SPACES_FIELD]: [spaceId, ALL_SPACES] } },
      { bool: { must_not: { exists: { field: SPACES_FIELD } } } },
    ],
  },
});

/**
 * Combine scope clauses into a single filter, collapsing the zero and one clause cases.
 *
 * Mirrors `mergeUserFilterWithNamespacesBool` in the Saved Objects ES|QL API and the same collapse
 * in `buildConstraintsFilter`. Clauses are ANDed: a document must satisfy every dimension.
 */
export const mergeScopeClauses = (
  clauses: QueryDslQueryContainer[]
): QueryDslQueryContainer | undefined => {
  if (clauses.length === 0) {
    return undefined;
  }
  if (clauses.length === 1) {
    return clauses[0];
  }
  return { bool: { must: clauses } };
};

/** Strip the quoting ES|QL allows around source names (`FROM "ai-index-*"`). */
const normalizeSource = (source: string): string => source.trim().replace(/^["'`]+|["'`]+$/g, '');

const parseSources = (indexPattern: string): string[] =>
  indexPattern.split(',').map(normalizeSource).filter(Boolean);

interface TargetProbe {
  /** Every concrete index the pattern resolved to, whether or not it maps a probed field. */
  indices: string[];
  /** The subset of the probed fields that is mapped somewhere in those indices. */
  presentFields: Set<string>;
}

type ProbeOutcome = { ok: true; probe: TargetProbe } | { ok: false; error: string };

/**
 * Outcome of resolving the scope filter.
 *
 * A refusal is reported rather than thrown so the tool can return it as a `ToolResultType.error`,
 * which is how the rest of the builtin tools surface a problem the model can act on. `ok: true` with
 * no `filter` means no scope applies, which is not the same as a refusal.
 */
export type EsqlScopeFilterResult =
  | { ok: true; filter?: QueryDslQueryContainer }
  | { ok: false; error: string };

/**
 * Resolve the concrete indices behind a pattern and report which probed fields they map.
 *
 * One call answers both questions, so a future dimension adds a name to `SCOPED_FIELDS` rather than
 * a round trip. The result is deliberately not cached: an index or mapping created between two
 * agent turns must take effect immediately, because what it gates is a security control.
 *
 * Fails closed. A clause that was never built cannot be told apart from one that was not needed, so
 * a `field_caps` error must not silently drop the space scope.
 */
const probeTargets = async ({
  index,
  fields,
  esClient,
  logger,
}: {
  index: string;
  fields: readonly string[];
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<ProbeOutcome> => {
  try {
    const response = await esClient.fieldCaps({
      index,
      fields: [...fields],
      ignore_unavailable: true,
      allow_no_indices: true,
    });
    const { indices } = response;
    return {
      ok: true,
      probe: {
        indices: Array.isArray(indices) ? indices : [indices].filter(Boolean),
        presentFields: new Set(Object.keys(response.fields)),
      },
    };
  } catch (error) {
    logger.warn(
      `Could not resolve scope targets for index pattern "${index}"; failing closed: ${
        (error as Error).message
      }`
    );
    return {
      ok: false,
      error: `Could not determine the space scope for this ES|QL query against "${index}"; please retry.`,
    };
  }
};

/**
 * Build the server-imposed scope filter for an ES|QL query, to be sent as the Elasticsearch
 * `filter` parameter.
 *
 * This filter is never exposed to the model. The agent must not be able to read, set, or remove a
 * security boundary, so it is resolved from the handler context rather than from tool arguments.
 *
 * Two gates have to pass before a clause is applied. The target indices must all sit in the AI index
 * namespace, and they must map the field the clause references. The namespace gate keeps the clause
 * away from unrelated indices that happen to map a same-named field; the field gate avoids
 * eliminating AI indices that do not carry the field at all.
 *
 * A query mixing AI indices with other indices is rejected rather than guessed at. Scoping the whole
 * query could silently drop the caller's unrelated rows, and scoping none of it would leave the AI
 * indices unprotected.
 *
 * Elasticsearch ANDs its own document-level security query on top of whatever we send. Space and
 * privilege enforcement for documents that carry permission tokens belongs there. This filter
 * covers what document-level security cannot see: documents with no tokens, which it treats as
 * public to every space, and Kibana agent configuration such as runtime constraints.
 *
 * Known gap: `filter` does not reach `LOOKUP JOIN` or `ENRICH` sources. `getIndexPatternFromESQLQuery`
 * does not extract those sources either, so the two behaviors agree, but a knowledge index used as
 * a lookup target is not scoped by this clause. Elasticsearch document-level security does cover
 * those sources.
 */
export const resolveEsqlScopeFilter = async ({
  query,
  spaceId,
  esClient,
  logger,
}: {
  query: string;
  spaceId: string;
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<EsqlScopeFilterResult> => {
  const sources = parseSources(getIndexPatternFromESQLQuery(query));

  // No source command to scope, for example a `ROW` or `SHOW` query.
  if (sources.length === 0) {
    return { ok: true };
  }

  const index = sources.join(',');
  const probed = await probeTargets({ index, fields: SCOPED_FIELDS, esClient, logger });
  if (!probed.ok) {
    return probed;
  }

  const { indices, presentFields } = probed.probe;
  const aiIndices = indices.filter(isAiIndex);

  // Nothing in the AI index namespace, so there is no Kibana-managed scope metadata to enforce.
  if (aiIndices.length === 0) {
    logger.debug(`No AI index in the ES|QL query against "${index}"; sending no scope filter`);
    return { ok: true };
  }

  if (aiIndices.length !== indices.length) {
    const others = indices.filter((candidate) => !isAiIndex(candidate));
    logger.warn(
      `Refusing to scope an ES|QL query that mixes AI indices with other indices: "${index}"`
    );
    return {
      ok: false,
      error:
        `This ES|QL query reads from AI indices (${aiIndices.join(', ')}) and from other indices ` +
        `(${others.join(', ')}) at the same time. They cannot be scoped together — ` +
        `query them separately.`,
    };
  }

  const clauses: QueryDslQueryContainer[] = [];
  if (presentFields.has(SPACES_FIELD)) {
    clauses.push(buildSpaceClause(spaceId));
  }
  // A runtime-constraints clause pushes here next. `buildConstraintsFilter` in `sml_service.ts`
  // already emits the right shape.

  const filter = mergeScopeClauses(clauses);

  logger.debug(
    filter
      ? `Scoping ES|QL query against "${index}" to space "${spaceId}"`
      : `No scope filter applies to the ES|QL query against "${index}"`
  );

  return { ok: true, filter };
};
