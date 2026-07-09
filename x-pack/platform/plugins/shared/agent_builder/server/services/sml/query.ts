/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { FieldValue, SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { AuthorizationServiceSetup } from '@kbn/security-plugin-types-server';
import type {
  SmlSearchResult,
  SmlAutocompleteResult,
  SmlDocument,
  SmlSearchFilters,
  SmlSearchConstraints,
  MatchedDiscoveryLabel,
  SmlPermissions,
} from '@kbn/agent-builder-server';
import { smlIndexName } from './storage';
import { SmlAuthzEnumerationIncompleteError } from './sml_authz_enumeration_incomplete_error';
import { SmlCorpusTooLargeError } from './sml_corpus_too_large_error';
import { MAX_CHUNKS_PER_ORIGIN } from '../../../common/constants';
import { isNotFoundError } from './indexer';

/**
 * Empty-but-fully-shaped permissions object. Used as a fallback when
 * `_source.permissions` is somehow missing (legacy / test docs).
 */
const emptyPermissions = (): SmlDocument['permissions'] => ({
  kibana: { privileges: [] },
});

/**
 * Batch-check which Kibana action strings the user is authorized for via a
 * single `_has_privileges` call. Fails closed (empty Set) on error.
 */
const getAuthorizedPrivileges = async ({
  permissions,
  request,
  securityAuthz,
  logger,
}: {
  permissions: string[];
  request: KibanaRequest;
  securityAuthz: AuthorizationServiceSetup;
  logger: Logger;
}): Promise<Set<string>> => {
  if (permissions.length === 0) {
    return new Set();
  }

  try {
    const checkPrivileges = securityAuthz.checkPrivilegesDynamicallyWithRequest(request);
    const response = await checkPrivileges({ kibana: permissions });

    return new Set(response.privileges.kibana.filter((p) => p.authorized).map((p) => p.privilege));
  } catch (error) {
    logger.warn(`SML privilege check failed; failing closed: ${(error as Error).message}`);
    return new Set();
  }
};

/**
 * Keyword leaf field enumerated by the pre-aggregation pass — the concrete
 * `_terms_enum`-addressable leaf of the `permissions` object (see storage.ts).
 */
const PERM_KIBANA_FIELD = 'permissions.kibana.privileges.name' as const;

/**
 * Enumerate every distinct value of the Kibana permission field across the SML
 * corpus via `_terms_enum`, paginated by `search_after`.
 *
 * Fail-closed: `complete: false` or exceeding the page ceiling throws rather
 * than proceeding with a partial universe. A missing index returns `[]`.
 */
const enumerateDistinctValues = async ({
  esClient,
  logger,
  pageSize = 1000,
  maxPages = 100,
}: {
  esClient: IScopedClusterClient;
  logger: Logger;
  pageSize?: number;
  maxPages?: number;
}): Promise<string[]> => {
  const values: string[] = [];
  let searchAfter: string | undefined;

  try {
    for (let page = 0; page < maxPages; page++) {
      const response = await esClient.asInternalUser.termsEnum({
        index: smlIndexName,
        field: PERM_KIBANA_FIELD,
        size: pageSize,
        ...(searchAfter !== undefined ? { search_after: searchAfter } : {}),
      });

      if (!response.complete) {
        logger.warn(
          `_terms_enum on '${PERM_KIBANA_FIELD}' returned complete=false; failing closed`
        );
        throw new SmlAuthzEnumerationIncompleteError(
          `Could not complete permission authorization for this search; please retry.`
        );
      }

      values.push(...response.terms);

      if (response.terms.length < pageSize) {
        return values;
      }
      searchAfter = response.terms[response.terms.length - 1];
    }
  } catch (error) {
    if (error instanceof SmlAuthzEnumerationIncompleteError) {
      throw error;
    }
    if (isNotFoundError(error)) {
      logger.debug(`SML index does not exist yet — '${PERM_KIBANA_FIELD}' universe is empty`);
      return [];
    }
    throw error;
  }

  throw new SmlCorpusTooLargeError(
    `Too many distinct permission values to authorize this search; the limit is ${
      maxPages * pageSize
    }.`
  );
};

/**
 * Result of the request-scoped pre-aggregation pass. `authorizedActions` are
 * the Kibana privileges the caller holds, intersected against what the corpus
 * uses. `kibanaUniverseNonEmpty` distinguishes "the corpus uses permissions but
 * the caller holds none" from "the corpus has no permissions at all".
 */
interface AuthorizedUniverse {
  authorizedActions: string[];
  kibanaUniverseNonEmpty: boolean;
}

/**
 * Pre-aggregation pass: discover the corpus's Kibana-privilege universe and
 * resolve which values the caller is authorized for. The resulting set is
 * pushed into the ES|QL search as an in-query authorization filter.
 */
export const resolveAuthorizedUniverse = async ({
  esClient,
  request,
  securityAuthz,
  logger,
}: {
  esClient: IScopedClusterClient;
  request: KibanaRequest;
  securityAuthz: AuthorizationServiceSetup;
  logger: Logger;
}): Promise<AuthorizedUniverse> => {
  const kibanaUniverse = await enumerateDistinctValues({ esClient, logger });

  const kibanaUniverseNonEmpty = kibanaUniverse.length > 0;

  if (!kibanaUniverseNonEmpty) {
    return { authorizedActions: [], kibanaUniverseNonEmpty };
  }

  const authorizedPerms = await getAuthorizedPrivileges({
    permissions: kibanaUniverse,
    request,
    securityAuthz,
    logger,
  });

  return {
    authorizedActions: [...authorizedPerms],
    kibanaUniverseNonEmpty,
  };
};

/**
 * Filter a page of results by the current user's Kibana privileges. Every
 * privilege listed on a chunk must be authorized; chunks with no privileges
 * pass trivially. No-op when the security plugin is absent (dev / test).
 */
const filterPageByPermissions = async <T extends { permissions: SmlPermissions }>(
  items: T[],
  {
    request,
    securityAuthz,
    logger,
  }: {
    request: KibanaRequest;
    securityAuthz?: AuthorizationServiceSetup;
    logger: Logger;
  }
): Promise<T[]> => {
  if (!securityAuthz || items.length === 0) return items;

  const allPermissions = [
    ...new Set(items.flatMap((hit) => hit.permissions.kibana.privileges.map((p) => p.name))),
  ];

  if (allPermissions.length === 0) {
    return items;
  }

  const authorizedPerms = await getAuthorizedPrivileges({
    permissions: allPermissions,
    request,
    securityAuthz,
    logger,
  });

  return items.filter((hit) => {
    const kbnPrivs = hit.permissions.kibana.privileges.map((p) => p.name);
    return kbnPrivs.length === 0 || kbnPrivs.every((p) => authorizedPerms.has(p));
  });
};

/**
 * Wrap filterPageByPermissions for callers that hold a `{ results }` object.
 * Used by the autocomplete path.
 */
export const filterResultsByPermissions = async <T extends { permissions: SmlPermissions }>({
  searchResult,
  request,
  securityAuthz,
  logger,
}: {
  searchResult: { results: T[] };
  request: KibanaRequest;
  securityAuthz?: AuthorizationServiceSetup;
  logger: Logger;
}): Promise<{ results: T[] }> => {
  const filtered = await filterPageByPermissions(searchResult.results, {
    request,
    securityAuthz,
    logger,
  });
  return { results: filtered };
};

/**
 * Check whether the current user has access to specific SML items. For each id,
 * access is granted iff every Kibana privilege listed on the document is
 * authorized. Documents with no privileges are visible to anyone in the space.
 * When the security plugin is absent, all ids resolve to `true`.
 *
 * Runs its lookup as `asInternalUser` so the access decision doesn't silently
 * degrade to "not found" for a user who lacks direct read on the SML index but
 * holds the relevant Kibana privileges.
 */
export const checkItemsAccess = async ({
  ids,
  spaceId,
  esClient,
  request,
  securityAuthz,
  logger,
}: {
  ids: string[];
  spaceId: string;
  esClient: IScopedClusterClient;
  request: KibanaRequest;
  securityAuthz?: AuthorizationServiceSetup;
  logger: Logger;
}): Promise<Map<string, boolean>> => {
  const accessMap = new Map<string, boolean>();

  if (!securityAuthz) {
    for (const id of ids) {
      accessMap.set(id, true);
    }
    return accessMap;
  }

  let docPrivs: Map<string, string[]>;
  try {
    const response = await esClient.asInternalUser.search<Pick<SmlDocument, 'id' | 'permissions'>>({
      index: smlIndexName,
      size: ids.length,
      allow_no_indices: true,
      ignore_unavailable: true,
      query: {
        bool: {
          filter: [
            { terms: { id: ids } },
            {
              bool: {
                should: [{ term: { spaces: spaceId } }, { term: { spaces: '*' } }],
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
      _source: ['id', 'permissions'],
    });

    docPrivs = new Map(
      response.hits.hits
        .filter((hit) => hit._source != null)
        .map((hit) => {
          const source = hit._source!;
          return [
            source.id ?? '',
            source.permissions?.kibana?.privileges?.map((p) => p.name) ?? [],
          ] as [string, string[]];
        })
    );
  } catch (error) {
    if (isNotFoundError(error)) {
      for (const id of ids) {
        accessMap.set(id, false);
      }
      return accessMap;
    }
    logger.warn(`SML items access check failed: ${(error as Error).message}`);
    for (const id of ids) {
      accessMap.set(id, false);
    }
    return accessMap;
  }

  const allPermissions = [...new Set([...docPrivs.values()].flat())];

  const authorizedPerms = await getAuthorizedPrivileges({
    permissions: allPermissions,
    request,
    securityAuthz,
    logger,
  });

  for (const id of ids) {
    const privs = docPrivs.get(id);
    if (!privs) {
      accessMap.set(id, false);
      continue;
    }
    accessMap.set(id, privs.length === 0 || privs.every((p) => authorizedPerms.has(p)));
  }

  return accessMap;
};

/**
 * Per-FORK-branch candidate depth multiplier. Each leg collects
 * `size * MAX_SCAN_MULTIPLIER` candidates before FUSE computes RRF scores.
 */
const MAX_SCAN_MULTIPLIER = 10;

/** BM25 text fields searched in the first FORK branch. */
const SML_BM25_FIELDS = ['title', 'description', 'content'] as const;

/** Semantic multi-fields searched in the second FORK branch. */
const SML_SEMANTIC_FIELDS = ['title.semantic', 'description.semantic', 'content.semantic'] as const;

/**
 * Build an ES|QL query string + positional params for the SML search path.
 *
 * Non-empty queries use two FORK branches (BM25 + semantic) merged by FUSE
 * with RRF. Empty/`*` queries fall back to a plain sorted scan. Spaces and
 * tag filters use MV_CONTAINS (not `==`) because `==` returns null on
 * multi-value fields. Authorization is enforced in-query via `authz`.
 */
export const buildSmlEsqlQuery = ({
  query,
  size,
  fields,
  spaceId,
  constraints,
  filters,
  authz,
}: {
  query: string;
  size: number;
  fields?: string[];
  spaceId: string;
  constraints?: SmlSearchConstraints;
  filters?: SmlSearchFilters;
  authz?: AuthorizedUniverse;
}): { esql: string; params: unknown[] } => {
  const params: unknown[] = [];
  // METADATA is required for FUSE (which needs _id, _index, _score to compute RRF).
  const lines: string[] = [`FROM ${smlIndexName} METADATA _id, _index, _score`];

  // spaces filter (see docblock for the MV_CONTAINS rationale)
  params.push(spaceId);
  lines.push('| WHERE MV_CONTAINS(spaces, ?)');

  // Authorization pre-filter: the authorized Kibana privileges set is bound as
  // a multivalue param. Emitted only when the corpus actually uses permissions.
  if (authz && authz.kibanaUniverseNonEmpty) {
    params.push(authz.authorizedActions);
    lines.push(`| WHERE MV_CONTAINS(?, ${PERM_KIBANA_FIELD})`);
  }

  // runtime-imposed per-type id-allowlist constraints
  if (constraints) {
    for (const [typeId, criteria] of Object.entries(constraints)) {
      if (!criteria?.ids) continue;
      if (criteria.ids.length === 0) {
        // Explicitly empty → exclude all documents of this type
        params.push(typeId);
        lines.push('| WHERE type != ?');
      } else {
        // Non-empty → allow matching docs of this type, pass through other types
        const uriPlaceholders = criteria.ids.map(() => '?').join(', ');
        params.push(typeId, ...criteria.ids.map((id) => `${typeId}://${id}`));
        lines.push(`| WHERE type != ? OR origin.uri IN (${uriPlaceholders})`);
      }
    }
  }

  // agent-discoverable type filter
  if (filters?.types && filters.types.length > 0) {
    const placeholders = filters.types.map(() => '?').join(', ');
    params.push(...filters.types);
    lines.push(`| WHERE type IN (${placeholders})`);
  }

  // agent-discoverable tag filter — MV_CONTAINS for multi-value safety
  if (filters?.tags && filters.tags.length > 0) {
    const tagConditions = filters.tags.map((tag) => {
      params.push(tag);
      return 'MV_CONTAINS(tags, ?)';
    });
    lines.push(`| WHERE ${tagConditions.join(' OR ')}`);
  }

  const trimmed = query.trim();
  if (trimmed === '' || trimmed === '*') {
    lines.push('| SORT id ASC');
  } else {
    // SORT _score DESC inside each branch is required so LIMIT selects the
    // top-scoring candidates before FUSE computes RRF ranks. Without it,
    // LIMIT takes the first N docs in scan order and FUSE assigns arbitrary
    // ranks, producing wrong results regardless of relevance scores.
    lines.push('| FORK');
    const bm25Conditions = SML_BM25_FIELDS.map((field) => {
      params.push(trimmed);
      return `MATCH(${field}, ?)`;
    }).join(' OR ');
    lines.push(
      `  (WHERE ${bm25Conditions} | SORT _score DESC | LIMIT ${size * MAX_SCAN_MULTIPLIER})`
    );
    const semanticConditions = SML_SEMANTIC_FIELDS.map((field) => {
      params.push(trimmed);
      return `MATCH(${field}, ?)`;
    }).join(' OR ');
    lines.push(
      `  (WHERE ${semanticConditions} | SORT _score DESC | LIMIT ${size * MAX_SCAN_MULTIPLIER})`
    );
    lines.push('| FUSE');
    lines.push('| SORT _score DESC, id ASC');
  }

  lines.push(`| LIMIT ${size}`);

  // description is included in the baseline (short summary, useful for triage).
  // content, tags, references, spaces, permissions are opt-in via the fields param.
  const DEFAULT_FIELDS = new Set(['description']);
  const shouldKeep = (f: string) =>
    fields !== undefined ? fields.includes(f) : DEFAULT_FIELDS.has(f);

  // Materialize object sub-fields into flat columns before KEEP.
  lines.push('| EVAL origin_uri = origin.uri');
  if (shouldKeep('references')) {
    lines.push('| EVAL ref_uris = references.uri');
  }

  // Materialize the permission leaf into a flat column for client-side
  // reconstruction. Always fetched for RBAC filtering; surfaced when requested.
  lines.push('| EVAL perm_kibana = permissions.kibana.privileges.name');

  // spaces is purely opt-in.
  const keepCols = [
    'id',
    'type',
    'title',
    'origin_uri',
    ...(shouldKeep('description') ? ['description'] : []),
    ...(shouldKeep('tags') ? ['tags'] : []),
    ...(shouldKeep('references') ? ['ref_uris'] : []),
    ...(shouldKeep('spaces') ? ['spaces'] : []),
    'perm_kibana',
    ...(shouldKeep('content') ? ['content'] : []),
  ];
  lines.push(`| KEEP ${keepCols.join(', ')}`);

  return { esql: lines.join('\n'), params };
};

/**
 * Build an ES filter clause from runtime-imposed per-type id-allowlist
 * constraints. Types without constraints are unaffected.
 */
export const buildConstraintsFilter = (
  constraints: SmlSearchConstraints | undefined
): Record<string, unknown> | undefined => {
  if (!constraints) {
    return undefined;
  }

  const clauses: Array<Record<string, unknown>> = [];

  for (const [typeId, criteria] of Object.entries(constraints)) {
    if (!criteria?.ids) {
      continue;
    }

    if (criteria.ids.length === 0) {
      // Explicitly empty → exclude all documents of this type
      clauses.push({ bool: { must_not: [{ term: { type: typeId } }] } });
    } else {
      // Non-empty → allow matching documents of this type, pass through other types
      clauses.push({
        bool: {
          should: [
            {
              terms: { 'origin.uri': criteria.ids.map((id) => `${typeId}://${id}`) },
            },
            {
              bool: {
                must_not: [{ term: { type: typeId } }],
              },
            },
          ],
          minimum_should_match: 1,
        },
      });
    }
  }

  if (clauses.length === 0) {
    return undefined;
  }

  if (clauses.length === 1) {
    return clauses[0];
  }

  return { bool: { must: clauses } };
};

/**
 * Build ES filter clauses from agent-discoverable `types[]` / `tags[]`
 * filters. Empty arrays are ignored (no constraint).
 */
export const buildAgentFilters = (
  filters: SmlSearchFilters | undefined
): Array<Record<string, unknown>> => {
  if (!filters) {
    return [];
  }

  const clauses: Array<Record<string, unknown>> = [];

  if (filters.types && filters.types.length > 0) {
    clauses.push({ terms: { type: filters.types } });
  }

  if (filters.tags && filters.tags.length > 0) {
    clauses.push({ terms: { tags: filters.tags } });
  }

  return clauses;
};

/**
 * Returns true for ES|QL errors that indicate the SML index does not exist yet.
 * ES|QL does not support `ignore_unavailable`; a missing index surfaces as a
 * `verification_exception` (400) or `index_not_found_exception` (400/404).
 */
const isEsqlIndexMissingError = (error: unknown): boolean => {
  if (!(error instanceof errors.ResponseError)) return false;
  const body = error.body as { error?: { type?: string; reason?: string } } | undefined;
  if (body?.error?.type === 'index_not_found_exception') return true;
  if (body?.error?.type === 'verification_exception') {
    // verification_exception covers many error types; narrow to missing-index cases.
    const reason = body.error?.reason ?? '';
    return reason.includes('no such index') || reason.includes('Unknown index');
  }
  return false;
};

/**
 * Search the SML index using ES|QL FORK + FUSE hybrid retrieval, with
 * Kibana-privilege authorization enforced in-query via pre-aggregation.
 *
 * Runs as `asCurrentUser` (native ES enforcement) with an additional
 * MV_CONTAINS subset filter for Kibana privileges. When the security
 * plugin is absent, all docs in the space are returned.
 */
export const searchSml = async ({
  query,
  size,
  fields,
  spaceId,
  esClient,
  request,
  securityAuthz,
  logger,
  constraints,
  filters,
}: {
  query: string;
  size: number;
  fields?: string[];
  spaceId: string;
  esClient: IScopedClusterClient;
  request: KibanaRequest;
  securityAuthz?: AuthorizationServiceSetup;
  logger: Logger;
  constraints?: SmlSearchConstraints;
  filters?: SmlSearchFilters;
}): Promise<{ results: SmlSearchResult[] }> => {
  logger.debug(`SML search: query=${JSON.stringify(query)}, size=${size}, spaceId='${spaceId}'`);

  // Pre-aggregation: resolve the caller's authorized permission universe so the
  // ES|QL query can filter to authorized docs in-query. Skipped when the
  // security plugin is absent (dev / test) — open-access parity.
  let authz: AuthorizedUniverse | undefined;
  if (securityAuthz) {
    authz = await resolveAuthorizedUniverse({ esClient, request, securityAuthz, logger });
    logger.debug(`SML search authz: actions=${authz.authorizedActions.length}`);
  }

  const { esql, params } = buildSmlEsqlQuery({
    query,
    size,
    fields,
    spaceId,
    constraints,
    filters,
    authz,
  });

  let response: { columns: Array<{ name: string; type: string }>; values: unknown[][] };
  try {
    response = await esClient.asCurrentUser.esql.query({
      query: esql,
      ...(params.length > 0 ? { params: params as unknown as FieldValue[] } : {}),
    });
  } catch (error) {
    if (isNotFoundError(error) || isEsqlIndexMissingError(error)) {
      logger.debug('SML index does not exist yet — returning empty results');
      return { results: [] };
    }
    logger.warn(`SML search failed: ${(error as Error).message}`);
    throw error;
  }

  const colIndex = new Map<string, number>(response.columns.map((col, i) => [col.name, i]));

  const toStringArray = (v: unknown): string[] => {
    if (v == null) return [];
    return Array.isArray(v) ? (v as unknown[]).filter((s) => s != null).map(String) : [String(v)];
  };

  // permissions columns are kept for optional surfacing (fields includes
  // 'permissions'); authorization itself is enforced in-query. spaces is
  // surfaced only when requested.
  type SmlSearchResultInternal = SmlSearchResult & { permissions: SmlPermissions };

  const allResults: SmlSearchResultInternal[] = response.values.map((row) => {
    const result: SmlSearchResultInternal = {
      id: String(row[colIndex.get('id')!] ?? ''),
      type: String(row[colIndex.get('type')!] ?? ''),
      title: String(row[colIndex.get('title')!] ?? ''),
      origin: { uri: String(row[colIndex.get('origin_uri')!] ?? '') },
      permissions: {
        kibana: {
          privileges: toStringArray(row[colIndex.get('perm_kibana')!]).map((name) => ({ name })),
        },
      },
    };
    const spacesIdx = colIndex.get('spaces');
    if (spacesIdx !== undefined) result.spaces = toStringArray(row[spacesIdx]);

    const contentIdx = colIndex.get('content');
    if (contentIdx !== undefined) {
      const content = row[contentIdx];
      if (content != null) result.content = String(content);
    }

    const descIdx = colIndex.get('description');
    if (descIdx !== undefined) {
      const desc = row[descIdx];
      if (desc != null) result.description = String(desc);
    }

    const tagsIdx = colIndex.get('tags');
    if (tagsIdx !== undefined) {
      const rawTags = row[tagsIdx];
      if (rawTags != null) result.tags = toStringArray(rawTags);
    }

    const refUrisIdx = colIndex.get('ref_uris');
    if (refUrisIdx !== undefined) {
      const refUris = toStringArray(row[refUrisIdx]);
      if (refUris.length > 0) result.references = refUris.map((uri) => ({ uri }));
    }

    return result;
  });

  // Authorization is already enforced in-query (MV_CONTAINS subset filters), so
  // every returned row is authorized and the ES|QL LIMIT bounds it to `size`.
  logger.debug(`SML search: returned=${response.values.length}, size=${size}`);
  const includePermissions = fields !== undefined && fields.includes('permissions');
  return {
    results: allResults.map(({ permissions, ...rest }) =>
      includePermissions ? { ...rest, permissions } : rest
    ),
  };
};

/**
 * Pick a highlight snippet from ES's per-subfield highlight object.
 * Returns the first non-empty snippet; absent if none.
 */
const pickHighlightSnippet = (
  highlight: Record<string, string[]> | undefined
): string | undefined => {
  if (!highlight) return undefined;
  for (const snippets of Object.values(highlight)) {
    if (snippets && snippets.length > 0) {
      return snippets[0];
    }
  }
  return undefined;
};

/**
 * Build the autocomplete query: nested `multi_match bool_prefix` against
 * `discovery_labels.value` SAYT subfields, with `inner_hits` for provenance.
 * Empty/`*` falls back to `match_all`.
 *
 * Known ES limitation: highlight snippets don't work for SAYT + bool_prefix +
 * nested + inner_hits (elastic/elasticsearch#53744). The highlight config is
 * retained for forward-compatibility.
 */
const buildSmlAutocompleteQuery = (query: string): Record<string, unknown> => {
  const trimmed = query.trim();
  if (trimmed === '' || trimmed === '*') {
    return { match_all: {} };
  }
  return {
    nested: {
      path: 'discovery_labels',
      query: {
        multi_match: {
          query: trimmed,
          type: 'bool_prefix',
          operator: 'and',
          fields: [
            'discovery_labels.value',
            'discovery_labels.value._2gram',
            'discovery_labels.value._3gram',
          ],
        },
      },
      inner_hits: {
        _source: ['discovery_labels.value', 'discovery_labels.kind'],
        size: 10,
        highlight: {
          type: 'unified',
          number_of_fragments: 0,
          pre_tags: ['<em>'],
          post_tags: ['</em>'],
          // HTML-encode the source text so literal `<`/`>`/`&` in user content
          // don't collide with the `<em>` wrappers when rendered. No-op while
          // #53744 keeps SAYT+nested highlight broken; correct once it lands.
          encoder: 'html',
          fields: {
            'discovery_labels.value': {},
          },
        },
      },
    },
  };
};

/**
 * Autocomplete the SML index. Prefix-only, with per-row provenance for the @ menu.
 */
export const autocompleteSml = async ({
  query,
  size,
  spaceId,
  esClient,
  logger,
  constraints,
  filters,
}: {
  query: string;
  size: number;
  spaceId: string;
  esClient: IScopedClusterClient;
  logger: Logger;
  constraints?: SmlSearchConstraints;
  filters?: SmlSearchFilters;
}): Promise<{ results: SmlAutocompleteResult[] }> => {
  logger.debug(
    `SML autocomplete: query=${JSON.stringify(
      query
    )}, size=${size}, spaceId='${spaceId}', index='${smlIndexName}'`
  );

  try {
    const smlQuery = buildSmlAutocompleteQuery(query);

    const filterClauses: Array<Record<string, unknown>> = [
      {
        bool: {
          should: [{ term: { spaces: spaceId } }, { term: { spaces: '*' } }],
          minimum_should_match: 1,
        },
      },
    ];
    const constraintsFilter = buildConstraintsFilter(constraints);
    if (constraintsFilter) {
      filterClauses.push(constraintsFilter);
    }
    for (const agentClause of buildAgentFilters(filters)) {
      filterClauses.push(agentClause);
    }

    const response = await esClient.asCurrentUser.search<SmlDocument>({
      index: smlIndexName,
      size,
      allow_no_indices: true,
      ignore_unavailable: true,
      query: {
        bool: {
          must: [smlQuery],
          filter: filterClauses,
        },
      },
      _source: ['id', 'type', 'title', 'origin', 'permissions'],
    });

    const results: SmlAutocompleteResult[] = response.hits.hits
      .filter((hit) => hit._source != null)
      .map((hit) => {
        const source = hit._source!;
        const result: SmlAutocompleteResult = {
          id: source.id ?? '',
          type: source.type ?? '',
          title: source.title ?? '',
          origin: { uri: source.origin?.uri ?? '' },
          spaces: source.spaces ?? [],
          permissions: source.permissions ?? emptyPermissions(),
        };
        // Inner hits from the nested discovery_labels query: the specific entries
        // that matched, with their ES-generated highlight snippet wrapping the
        // matched span(s) in <em>...</em>.
        const innerHits = (
          hit as {
            inner_hits?: Record<
              string,
              {
                hits: {
                  hits: Array<{
                    _source: { value?: string; kind?: string };
                    highlight?: Record<string, string[]>;
                  }>;
                };
              }
            >;
          }
        ).inner_hits;
        const labelHits = innerHits?.discovery_labels?.hits?.hits;
        if (labelHits && labelHits.length > 0) {
          const matched: MatchedDiscoveryLabel[] = labelHits
            .filter((h) => h._source?.value != null && h._source?.kind != null)
            .map((h) => {
              const entry: MatchedDiscoveryLabel = {
                value: h._source.value!,
                kind: h._source.kind!,
              };
              const snippet = pickHighlightSnippet(h.highlight);
              if (snippet) {
                entry.highlighted = snippet;
              }
              return entry;
            });
          if (matched.length > 0) {
            result.matched_discovery_labels = matched;
          }
        }
        return result;
      });

    logger.debug(`SML autocomplete: returned ${results.length} result(s)`);

    return { results };
  } catch (error) {
    if (isNotFoundError(error)) {
      logger.debug('SML index does not exist yet — returning empty autocomplete results');
      return { results: [] };
    }
    logger.warn(`SML autocomplete failed: ${(error as Error).message}`);
    throw error;
  }
};

/**
 * Fetch SML documents by their chunk IDs, scoped to a space.
 */
export const getDocumentsByIds = async ({
  ids,
  spaceId,
  esClient,
  logger,
}: {
  ids: string[];
  spaceId: string;
  esClient: IScopedClusterClient;
  logger: Logger;
}): Promise<Map<string, SmlDocument>> => {
  const docMap = new Map<string, SmlDocument>();
  if (ids.length === 0) return docMap;

  try {
    const response = await esClient.asCurrentUser.search<SmlDocument>({
      index: smlIndexName,
      size: ids.length,
      allow_no_indices: true,
      ignore_unavailable: true,
      query: {
        bool: {
          filter: [
            { terms: { id: ids } },
            {
              bool: {
                should: [{ term: { spaces: spaceId } }, { term: { spaces: '*' } }],
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
    });

    for (const hit of response.hits.hits) {
      if (!hit._source) continue;
      const doc = hydrateDocument(hit._source);
      docMap.set(doc.id, doc);
    }
  } catch (error) {
    if (!isNotFoundError(error)) {
      logger.warn(`SML getDocuments failed: ${(error as Error).message}`);
    }
  }

  return docMap;
};

/**
 * Extract the total-hit count from an ES search response in a way that
 * tolerates both the legacy numeric shape (older clients) and the
 * `{ value, relation }` object shape returned when `track_total_hits`
 * is set. Falls back to `0` when the field is absent.
 */
const extractTotalHits = (total: SearchTotalHits | number | undefined): number => {
  if (total === undefined) return 0;
  if (typeof total === 'number') return total;
  return total.value;
};

/**
 * Compose the canonical `origin.uri` from the SML `type` and bare
 * `originId`. Single source of truth for the URI scheme.
 *
 * Exported for the HTTP routes; the indexer derives it internally.
 */
export const buildOriginUri = (type: string, originId: string): string => `${type}://${originId}`;

/**
 * Fetch visible chunks for `(type, originId)` in `spaceId`, bounded by
 * {@link MAX_CHUNKS_PER_ORIGIN}. Lookups key on `origin.uri` since bare
 * `originId` is not unique across types.
 */
export const findByOrigin = async ({
  type,
  originId,
  spaceId,
  esClient,
  logger,
}: {
  type: string;
  originId: string;
  spaceId: string;
  esClient: IScopedClusterClient;
  logger: Logger;
}): Promise<SmlDocument[]> => {
  const originUri = buildOriginUri(type, originId);
  try {
    const response = await esClient.asCurrentUser.search<SmlDocument>({
      index: smlIndexName,
      size: MAX_CHUNKS_PER_ORIGIN,
      track_total_hits: true,
      allow_no_indices: true,
      ignore_unavailable: true,
      query: {
        bool: {
          filter: [
            { term: { 'origin.uri': originUri } },
            {
              bool: {
                should: [{ term: { spaces: spaceId } }, { term: { spaces: '*' } }],
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
    });

    const total = extractTotalHits(response.hits.total);
    if (total > MAX_CHUNKS_PER_ORIGIN) {
      logger.warn(
        `SML findByOrigin: origin '${originUri}' has ${total} chunks in space '${spaceId}' but only the first ${MAX_CHUNKS_PER_ORIGIN} are returned. Producer is likely misbehaving — investigate before the cross-space guard becomes unreliable.`
      );
    }

    return response.hits.hits
      .filter((hit) => hit._source != null)
      .map((hit) => hydrateDocument(hit._source!));
  } catch (error) {
    if (isNotFoundError(error)) {
      return [];
    }
    logger.warn(`SML findByOrigin failed: ${(error as Error).message}`);
    throw error;
  }
};

/**
 * `_source` fields fetched by `findByOriginAcrossSpaces`. Only the fields the
 * cross-space guard needs (id, type, spaces, origin, created_at) — trimming
 * content/title/description/permissions avoids pulling up to 50 MB per call.
 */
const FIND_ACROSS_SPACES_SOURCE_FIELDS: ReadonlyArray<keyof SmlDocument> = [
  'id',
  'type',
  'spaces',
  'origin',
  'created_at',
];

/**
 * Fetch every chunk written under `(type, originId)` regardless of space.
 *
 * Used exclusively by the HTTP routes' cross-space-overwrite guard — never
 * for read paths that surface data to users. Returns `[]` on
 * `index_not_found`. Overflow beyond {@link MAX_CHUNKS_PER_ORIGIN} throws
 * {@link SmlCorpusTooLargeError} (fail-closed).
 *
 * Returned documents carry only {@link FIND_ACROSS_SPACES_SOURCE_FIELDS};
 * callers must treat them as guard-only.
 */
export const findByOriginAcrossSpaces = async ({
  type,
  originId,
  esClient,
  logger,
}: {
  type: string;
  originId: string;
  esClient: IScopedClusterClient;
  logger: Logger;
}): Promise<SmlDocument[]> => {
  const originUri = buildOriginUri(type, originId);
  try {
    const response = await esClient.asCurrentUser.search<SmlDocument>({
      index: smlIndexName,
      size: MAX_CHUNKS_PER_ORIGIN,
      track_total_hits: true,
      _source: FIND_ACROSS_SPACES_SOURCE_FIELDS as unknown as string[],
      allow_no_indices: true,
      ignore_unavailable: true,
      query: {
        bool: {
          filter: [{ term: { 'origin.uri': originUri } }],
        },
      },
    });

    const total = extractTotalHits(response.hits.total);
    if (total > MAX_CHUNKS_PER_ORIGIN) {
      throw new SmlCorpusTooLargeError(
        `SML origin '${originUri}' has ${total} chunks, which exceeds the ${MAX_CHUNKS_PER_ORIGIN}-chunk cross-space guard limit. The write is rejected to avoid acting on a partial cross-space view. Reduce the chunk count for this origin before retrying.`
      );
    }

    return response.hits.hits
      .filter((hit) => hit._source != null)
      .map((hit) => hydrateDocument(hit._source!));
  } catch (error) {
    if (isNotFoundError(error)) {
      return [];
    }
    // SmlCorpusTooLargeError is an intentional fail-closed signal — let it
    // propagate without the generic "failed" warn, which would be redundant.
    if (!(error instanceof SmlCorpusTooLargeError)) {
      logger.warn(`SML findByOriginAcrossSpaces failed: ${(error as Error).message}`);
    }
    throw error;
  }
};

/**
 * Project an ES `_source` payload into the canonical `SmlDocument`
 * shape used everywhere downstream. Centralised because three readers
 * (getDocumentsByIds, findByOrigin, findByOriginAcrossSpaces) apply
 * the same mapping — keeping them in sync by-hand is a footgun.
 */
const hydrateDocument = (source: SmlDocument): SmlDocument => {
  const originUri = source.origin?.uri ?? '';
  const doc: SmlDocument = {
    id: source.id ?? '',
    type: source.type ?? '',
    title: source.title ?? '',
    origin_id: source.origin_id ?? originUri.split('://')[1] ?? '',
    origin: { uri: originUri },
    content: source.content ?? '',
    created_at: source.created_at ?? '',
    updated_at: source.updated_at ?? '',
    spaces: source.spaces ?? [],
    permissions: source.permissions ?? emptyPermissions(),
    ingestion_method: source.ingestion_method ?? 'crawled',
  };
  if (source.description !== undefined) doc.description = source.description;
  if (source.tags !== undefined) doc.tags = source.tags;
  if (source.discovery_labels !== undefined) doc.discovery_labels = source.discovery_labels;
  if (source.extended_attrs !== undefined) doc.extended_attrs = source.extended_attrs;
  if (source.user_id !== undefined) doc.user_id = source.user_id;
  if (source.references !== undefined) doc.references = source.references;
  return doc;
};

/**
 * True when a document with the given `spaces` field is visible from
 * `spaceId`. Wildcard (`'*'`) entries are treated as global.
 *
 * Exported so route helpers (HTTP upsert/delete cross-space guard) can
 * apply the same predicate used internally by `findByOrigin`.
 */
export const isVisibleInSpace = (spaces: string[] | undefined, spaceId: string): boolean => {
  if (!spaces || spaces.length === 0) return false;
  return spaces.includes(spaceId) || spaces.includes('*');
};
