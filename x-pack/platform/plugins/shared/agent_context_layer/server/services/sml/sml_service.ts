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
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type {
  SmlService,
  SmlSearchResult,
  SmlDocument,
  SmlTypeDefinition,
  SmlSearchFilters,
} from './types';
import { createSmlTypeRegistry, type SmlTypeRegistry } from './sml_type_registry';
import { createSmlIndexer, type SmlIndexer } from './sml_indexer';
import { SmlCrawlerImpl } from './sml_crawler';
import type { SmlCrawler } from './types';
import { smlIndexName } from './sml_storage';

export interface SmlServiceSetup {
  /**
   * Register an SML type definition.
   * Should be called during plugin setup.
   */
  registerType: (definition: SmlTypeDefinition) => void;
}

export interface SmlServiceStartDeps {
  logger: Logger;
  securityAuthz?: AuthorizationServiceSetup;
  /**
   * Security service used to derive the current user's username from the
   * incoming request, which is then used as a per-document user filter
   * for chunks that opt in via `SmlChunk.userId`.
   */
  security?: SecurityServiceStart;
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
  private security?: SecurityServiceStart;

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

  start({ logger, securityAuthz, security }: SmlServiceStartDeps): SmlService {
    this.securityAuthz = securityAuthz;
    this.security = security;
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
      search: async ({ query, size = 10, spaceId, esClient, request, skipContent, filters }) => {
        const userId = this.getUserIdForRequest(request);
        const rawResults = await searchSml({
          query,
          size,
          spaceId,
          userId,
          esClient,
          logger,
          skipContent,
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
        const userId = this.getUserIdForRequest(request);
        return checkItemsAccess({
          ids,
          spaceId,
          userId,
          esClient,
          request,
          securityAuthz: this.securityAuthz,
          logger,
        });
      },
      indexAttachment: async (params) => {
        return this.getIndexer().indexAttachment(params);
      },
      getDocuments: async ({ ids, spaceId, esClient, request }) => {
        const userId = request ? this.getUserIdForRequest(request) : undefined;
        return getDocumentsByIds({ ids, spaceId, userId, esClient, logger });
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

  /**
   * Derive the username for the request, used to filter chunks that have an
   * indexed `user_id`. Returns `undefined` for fake requests (e.g. background
   * tasks) and when the security plugin is absent — in those cases all
   * user-scoped chunks are excluded from the response (closed by default).
   */
  private getUserIdForRequest(request: KibanaRequest): string | undefined {
    if (!this.security) return undefined;
    if (request.isFakeRequest) return undefined;
    return this.security.authc.getCurrentUser(request)?.username;
  }
}

export const isNotFoundError = (error: unknown): boolean => {
  return error instanceof errors.ResponseError && error.statusCode === 404;
};

/**
 * Batch-check which of the given Kibana privilege strings the current user holds.
 * Returns the set of authorized privilege strings.
 */
const getAuthorizedPermissions = async ({
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
    logger.warn(`SML permission check failed: ${(error as Error).message}`);
    return new Set();
  }
};

/**
 * Filter search results by the current user's permissions.
 *
 * 1. Collect all unique permission strings from the results.
 * 2. Batch-check them with the security plugin.
 * 3. Remove results whose required permissions are not fully authorized.
 */
const filterResultsByPermissions = async ({
  searchResult,
  request,
  securityAuthz,
  logger,
}: {
  searchResult: { results: SmlSearchResult[]; total: number };
  request: KibanaRequest;
  securityAuthz?: AuthorizationServiceSetup;
  logger: Logger;
}): Promise<{ results: SmlSearchResult[]; total: number }> => {
  // When the security plugin is absent (e.g. development/testing with security
  // disabled), all results are returned unfiltered. This follows the standard
  // Kibana convention: no security plugin → open access.
  if (!securityAuthz || searchResult.results.length === 0) {
    return searchResult;
  }

  const allPermissions = [...new Set(searchResult.results.flatMap((hit) => hit.permissions))];

  if (allPermissions.length === 0) {
    return searchResult;
  }

  const authorizedPerms = await getAuthorizedPermissions({
    permissions: allPermissions,
    request,
    securityAuthz,
    logger,
  });

  const filteredResults = searchResult.results.filter((hit) => {
    if (hit.permissions.length === 0) return true;
    return hit.permissions.every((p) => authorizedPerms.has(p));
  });

  return { results: filteredResults, total: filteredResults.length };
};

/**
 * Build the bool clause that filters out user-scoped chunks the requester
 * shouldn't see:
 *
 *  - chunks without `user_id` are visible to anyone (existing behavior)
 *  - chunks with `user_id` are only visible when it matches the requester
 *
 * When the requester's username can't be resolved (fake request / no security),
 * user-scoped chunks are excluded entirely.
 */
const buildUserScopeFilter = (userId: string | undefined): Record<string, unknown> => {
  if (userId) {
    return {
      bool: {
        should: [
          { bool: { must_not: [{ exists: { field: 'user_id' } }] } },
          { term: { user_id: userId } },
        ],
        minimum_should_match: 1,
      },
    };
  }
  return {
    bool: {
      must_not: [{ exists: { field: 'user_id' } }],
    },
  };
};

/**
 * Check whether the current user has access to specific SML items.
 * Looks up each item's permissions from the index and batch-checks them.
 */
const checkItemsAccess = async ({
  ids,
  spaceId,
  userId,
  esClient,
  request,
  securityAuthz,
  logger,
}: {
  ids: string[];
  spaceId: string;
  userId: string | undefined;
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

  let docPermissions: Map<string, string[]>;
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
            buildUserScopeFilter(userId),
          ],
        },
      },
      _source: ['id', 'permissions'],
    });

    docPermissions = new Map(
      response.hits.hits
        .filter((hit) => hit._source != null)
        .map((hit) => {
          const source = hit._source!;
          return [source.id ?? '', source.permissions ?? []] as [string, string[]];
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

  const allPermissions = [...new Set([...docPermissions.values()].flat())];

  const authorizedPerms = await getAuthorizedPermissions({
    permissions: allPermissions,
    request,
    securityAuthz,
    logger,
  });

  for (const id of ids) {
    const perms = docPermissions.get(id);
    if (!perms) {
      accessMap.set(id, false);
      continue;
    }
    if (perms.length === 0) {
      accessMap.set(id, true);
      continue;
    }
    accessMap.set(
      id,
      perms.every((p) => authorizedPerms.has(p))
    );
  }

  return accessMap;
};

const SML_SEARCH_AS_YOU_TYPE_FIELDS = [
  'title',
  'title._2gram', // Combination of two words
  'title._3gram', // Combination of three words
  'title._index_prefix',
  'type.autocomplete',
  'type.autocomplete._index_prefix',
] as const;

/**
 * Build the search query from a single string. `type` and `title` use search_as_you_type + bool_prefix
 * for autocomplete-style matching, while `content` and `description` (semantic_text fields) are
 * matched with standard `match` queries so longer-form text is also retrievable.
 *
 * After trim: empty string or `*` → `match_all` (return everything).
 */
const buildSmlSearchQuery = (query: string): Record<string, unknown> => {
  const trimmed = query.trim();
  if (trimmed === '' || trimmed === '*') {
    return { match_all: {} };
  }
  return {
    bool: {
      should: [
        {
          multi_match: {
            query: trimmed,
            type: 'bool_prefix',
            fields: [...SML_SEARCH_AS_YOU_TYPE_FIELDS],
          },
        },
        { match: { content: trimmed } },
        { match: { description: trimmed } },
      ],
      minimum_should_match: 1,
    },
  };
};

/**
 * Build an ES filter clause from per-type SML search filters.
 *
 * For each type with an `ids` constraint, the filter returns documents that
 * either (a) match the type AND have an origin_id in the list, or (b) are
 * NOT of the constrained type. Types without filters are unaffected.
 */
export const buildTypeFilters = (
  filters: SmlSearchFilters | undefined
): Record<string, unknown> | undefined => {
  if (!filters) {
    return undefined;
  }

  const clauses: Array<Record<string, unknown>> = [];

  for (const [typeId, criteria] of Object.entries(filters)) {
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
              bool: {
                must: [{ term: { type: typeId } }, { terms: { origin_id: criteria.ids } }],
              },
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
 * Search the SML index. When the index hasn't been created yet,
 * the function returns empty results silently.
 */
const searchSml = async ({
  query,
  size,
  spaceId,
  userId,
  esClient,
  logger,
  skipContent,
  filters,
}: {
  query: string;
  size: number;
  spaceId: string;
  userId: string | undefined;
  esClient: IScopedClusterClient;
  logger: Logger;
  skipContent?: boolean;
  filters?: SmlSearchFilters;
}): Promise<{ results: SmlSearchResult[]; total: number }> => {
  logger.debug(
    `SML search: query=${JSON.stringify(
      query
    )}, size=${size}, spaceId='${spaceId}', index='${smlIndexName}'`
  );

  try {
    const smlQuery = buildSmlSearchQuery(query);

    const typeFilter = buildTypeFilters(filters);
    const filterClauses: Array<Record<string, unknown>> = [
      {
        bool: {
          should: [{ term: { spaces: spaceId } }, { term: { spaces: '*' } }],
          minimum_should_match: 1,
        },
      },
      buildUserScopeFilter(userId),
    ];
    if (typeFilter) {
      filterClauses.push(typeFilter);
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
      _source: skipContent ? { excludes: ['content', 'description'] } : true,
    });

    const total =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value ?? 0;

    const results: SmlSearchResult[] = response.hits.hits
      .filter((hit) => hit._source != null)
      .map((hit) => {
        const source = hit._source!;
        return {
          id: source.id ?? '',
          type: source.type ?? '',
          title: source.title ?? '',
          origin_id: source.origin_id ?? '',
          content: source.content,
          description: source.description,
          references: source.references,
          created_at: source.created_at ?? '',
          updated_at: source.updated_at ?? '',
          spaces: source.spaces ?? [],
          permissions: source.permissions ?? [],
          ...(source.user_id ? { user_id: source.user_id } : {}),
          score: hit._score ?? 0,
        };
      });

    logger.debug(`SML search: returned ${results.length} result(s), total=${total}`);

    return { results, total };
  } catch (error) {
    if (isNotFoundError(error)) {
      logger.debug('SML index does not exist yet — returning empty results');
      return { results: [], total: 0 };
    }
    logger.warn(`SML search failed: ${(error as Error).message}`);
    throw error;
  }
};

/**
 * Fetch SML documents by their chunk IDs, scoped to a space.
 */
const getDocumentsByIds = async ({
  ids,
  spaceId,
  userId,
  esClient,
  logger,
}: {
  ids: string[];
  spaceId: string;
  userId: string | undefined;
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
            buildUserScopeFilter(userId),
          ],
        },
      },
    });

    for (const hit of response.hits.hits) {
      if (!hit._source) continue;
      const source = hit._source;
      const doc: SmlDocument = {
        id: source.id ?? '',
        type: source.type ?? '',
        title: source.title ?? '',
        origin_id: source.origin_id ?? '',
        content: source.content ?? '',
        created_at: source.created_at ?? '',
        updated_at: source.updated_at ?? '',
        spaces: source.spaces ?? [],
        permissions: source.permissions ?? [],
        ...(source.user_id ? { user_id: source.user_id } : {}),
      };
      if (source.description !== undefined) {
        doc.description = source.description;
      }
      if (source.user_id !== undefined) {
        doc.user_id = source.user_id;
      }
      if (source.references !== undefined) {
        doc.references = source.references;
      }
      docMap.set(doc.id, doc);
    }
  } catch (error) {
    if (!isNotFoundError(error)) {
      logger.warn(`SML getDocuments failed: ${(error as Error).message}`);
    }
  }

  return docMap;
};
