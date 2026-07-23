/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { AuthorizationServiceSetup } from '@kbn/security-plugin-types-server';
import type {
  SmlService,
  SmlAutocompleteResult,
  SmlDocument,
  SmlTypeDefinition,
  SmlSearchFilters,
  SmlSearchConstraints,
  MatchedDiscoveryLabel,
  SmlPermissions,
} from './types';
import { createSmlTypeRegistry, type SmlTypeRegistry } from './sml_type_registry';
import { createSmlIndexer, type SmlIndexer } from './sml_indexer';
import { SmlCrawlerImpl } from './sml_crawler';
import type { SmlCrawler } from './types';
import { smlIndexName } from './sml_storage';
// ES client usage pattern in this module:
// - Read operations (search, getDocuments, checkAccess) use `esClient.asInternalUser` directly with
//   `allow_no_indices: true` / `ignore_unavailable: true` so they silently handle a missing index.
// - Every write path (origin-mode crawler, HTTP PUT/DELETE) goes through `SmlIndexer` so
//   type-registration enforcement, permission derivation, and storage shape stay consistent.
//   There are no document-write paths in this file.

export interface SmlServiceSetup {
  /**
   * Register an SML type definition.
   * Should be called during plugin setup.
   */
  registerType: (definition: SmlTypeDefinition) => void;
}

interface SmlServiceStartDeps {
  logger: Logger;
  securityAuthz?: AuthorizationServiceSetup;
}

export interface SmlServiceInstance {
  setup: (deps: { logger: Logger }) => SmlServiceSetup;
  start: (deps: SmlServiceStartDeps) => SmlService;
}

export const createSmlService = (): SmlServiceInstance => {
  return new SmlServiceImpl();
};

class SmlServiceImpl implements SmlServiceInstance {
  private registry: SmlTypeRegistry;
  private indexer?: SmlIndexer;
  private crawler?: SmlCrawler;
  private securityAuthz?: AuthorizationServiceSetup;

  constructor() {
    this.registry = createSmlTypeRegistry();
  }

  setup({ logger }: { logger: Logger }): SmlServiceSetup {
    return {
      registerType: (definition: SmlTypeDefinition) => {
        this.registry.register(definition);
        logger.info(`Registered SML type: ${definition.id}`);
      },
    };
  }

  start({ logger, securityAuthz }: SmlServiceStartDeps): SmlService {
    this.securityAuthz = securityAuthz;
    if (!securityAuthz) {
      logger.warn(
        'SML service started without security authorization — permission checks are disabled (open access)'
      );
    }
    this.indexer = createSmlIndexer({ registry: this.registry, logger: logger.get('indexer') });
    this.crawler = new SmlCrawlerImpl({
      indexer: this.indexer,
      logger: logger.get('crawler'),
    });

    const crawler = this.crawler;

    return {
      getCrawler: () => crawler,
      autocomplete: async ({
        query,
        size = 10,
        spaceId,
        esClient,
        request,
        constraints,
        filters,
      }) => {
        const rawResults = await autocompleteSml({
          query,
          size,
          spaceId,
          esClient,
          logger,
          constraints,
          filters,
        });
        return filterResultsByPermissions({
          searchResult: rawResults,
          request,
          securityAuthz: this.securityAuthz,
          logger,
        });
      },
      checkItemsAccess: async ({ ids, spaceId, esClient, request }) => {
        return checkItemsAccess({
          ids,
          spaceId,
          esClient,
          request,
          securityAuthz: this.securityAuthz,
          logger,
        });
      },
      indexAttachment: async (params) => {
        return this.getIndexer().indexAttachment(params);
      },
      deleteAttachment: async (params) => {
        return this.getIndexer().deleteAttachment(params);
      },
      getDocuments: async ({ ids, spaceId, esClient }) => {
        return getDocumentsByIds({ ids, spaceId, esClient, logger });
      },
      getTypeDefinition: (typeId: string) => {
        return this.registry.get(typeId);
      },
      listTypeDefinitions: () => {
        return this.registry.list();
      },
    };
  }

  private getIndexer(): SmlIndexer {
    if (!this.indexer) {
      throw new Error('SML indexer not initialized — call start() first');
    }
    return this.indexer;
  }
}

export const isNotFoundError = (error: unknown): boolean => {
  return error instanceof errors.ResponseError && error.statusCode === 404;
};

/**
 * Empty-but-fully-shaped permissions object. Used as a fallback when
 * `_source.permissions` is somehow missing (legacy / test docs).
 */
const emptyPermissions = (): SmlDocument['permissions'] => ({
  kibana: { privileges: [] },
});

/**
 * Privilege check for SML entries. Batch-checks which of the given Kibana
 * action strings are authorized for the user in the current space via a
 * single `_has_privileges` call (Kibana's `checkPrivileges` wrapper).
 *
 * Fails closed (empty Set) on error to avoid over-disclosure — a
 * transient ES error must not silently bypass the check.
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
 * Filter a single page of results by the current user's Kibana privileges.
 * Every action string an entry lists must be authorized for the user;
 * entries with no `kibana.privileges` pass trivially.
 *
 * Used by the search loop (per page) and directly by autocomplete (single
 * pass). When the security plugin is absent (dev / test), the function is
 * a no-op to preserve open-access semantics.
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
const filterResultsByPermissions = async <T extends { permissions: SmlPermissions }>({
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
 * Check whether the current user has access to specific SML items.
 * For each id, the access verdict checks that all listed Kibana
 * `permissions.kibana.privileges[].name` action strings are authorized.
 *
 * Chunks without any kibana privileges are visible to anyone in the
 * space. When the security plugin is absent, all ids resolve to `true`
 * (open access).
 */
const checkItemsAccess = async ({
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

  // When the security plugin is absent, grant access to all items.
  if (!securityAuthz) {
    for (const id of ids) {
      accessMap.set(id, true);
    }
    return accessMap;
  }

  let docAuthz: Map<string, string[]>;
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

    docAuthz = new Map(
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

  const allPermissions = [...new Set([...docAuthz.values()].flat())];

  const authorizedPerms = await getAuthorizedPrivileges({
    permissions: allPermissions,
    request,
    securityAuthz,
    logger,
  });

  for (const id of ids) {
    const kbnPrivs = docAuthz.get(id);
    if (!kbnPrivs) {
      accessMap.set(id, false);
      continue;
    }
    accessMap.set(id, kbnPrivs.length === 0 || kbnPrivs.every((p) => authorizedPerms.has(p)));
  }

  return accessMap;
};

/**
 * Build an ES filter clause from runtime-imposed per-type constraints.
 *
 * For each type with an `ids` constraint, the filter returns documents that
 * either (a) match the type AND have an origin_id in the list, or (b) are
 * NOT of the constrained type. Types without constraints are unaffected.
 *
 * Renamed from `buildTypeFilters` to reflect the trust-boundary split
 * between runtime-imposed scope and agent-discoverable filters.
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
 * Build ES filter clauses from agent-discoverable filters (`types[]`,
 * `tags[]`). Each dimension lowers into a single `terms` clause; multiple
 * dimensions AND together via inclusion in the outer `filter` list.
 *
 * Empty arrays are ignored (treated as "no constraint") — the agent has no
 * way to express "exclude everything" and passing `[]` accidentally should
 * be a no-op.
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

const SML_LABEL_FIELDS = [
  'discovery_labels.value',
  'discovery_labels.value._2gram',
  'discovery_labels.value._3gram',
] as const;

const SML_LABEL_INNER_HITS = {
  _source: ['discovery_labels.value', 'discovery_labels.kind'],
  size: 10,
  highlight: {
    type: 'unified',
    number_of_fragments: 0,
    pre_tags: ['<em>'],
    post_tags: ['</em>'],
    // No-op until elastic/elasticsearch#53744 is fixed; HTML-encodes source text.
    encoder: 'html',
    fields: {
      'discovery_labels.value': {},
    },
  },
} as const;

const buildLabelBoolPrefixClause = (text: string): Record<string, unknown> => ({
  multi_match: {
    query: text,
    type: 'bool_prefix',
    operator: 'and',
    fields: SML_LABEL_FIELDS,
  },
});

const buildNestedLabelQuery = (text: string): Record<string, unknown> => ({
  nested: {
    path: 'discovery_labels',
    query: buildLabelBoolPrefixClause(text),
    inner_hits: SML_LABEL_INNER_HITS,
  },
});

/**
 * Build the autocomplete query: nested `multi_match bool_prefix` against
 * `discovery_labels.value` (SAYT), requiring every typed token to match
 * (including the trailing partial, as a prefix).
 *
 * `type` and `title` are indexed as separate `discovery_labels` siblings, and
 * a nested query can't match tokens across siblings. So a "type/name" query
 * (e.g. "connector/s3", matching how results render) is split into two
 * nested queries ANDed together instead of one, each free to match a
 * different sibling — the type part is also constrained to `kind: 'type'`.
 * A bare trailing slash ("connector/") falls back to a single query so the
 * type value itself still matches.
 *
 * After trim: empty string or `*` → `match_all`.
 */
const buildSmlAutocompleteQuery = (query: string): Record<string, unknown> => {
  const trimmed = query.trim();
  if (trimmed === '' || trimmed === '*') {
    return { match_all: {} };
  }

  const slashIdx = trimmed.indexOf('/');
  const namePart = slashIdx === -1 ? '' : trimmed.slice(slashIdx + 1).trim();

  if (slashIdx === -1 || namePart === '') {
    return buildNestedLabelQuery(trimmed);
  }

  const typePart = trimmed.slice(0, slashIdx).trim();
  const nameClause = buildNestedLabelQuery(namePart);

  if (!typePart) {
    return nameClause;
  }

  const typeClause = {
    nested: {
      path: 'discovery_labels',
      query: {
        bool: {
          must: [
            buildLabelBoolPrefixClause(typePart),
            { term: { 'discovery_labels.kind': 'type' } },
          ],
        },
      },
    },
  };

  return { bool: { must: [typeClause, nameClause] } };
};

/**
 * Autocomplete the SML index. Prefix-only, with per-row provenance for the @ menu.
 */
const autocompleteSml = async ({
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

    const response = await esClient.asInternalUser.search<SmlDocument>({
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
 * Fetch SML documents by their IDs, scoped to a space.
 */
const getDocumentsByIds = async ({
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
    const response = await esClient.asInternalUser.search<SmlDocument>({
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
 * Project an ES `_source` payload into the canonical `SmlDocument`
 * shape used everywhere downstream. Centralised because `getDocumentsByIds`
 * (and any future reader) applies the same mapping — keeping them in sync
 * by-hand is a footgun.
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
