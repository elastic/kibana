/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { AuthorizationServiceSetup } from '@kbn/security-plugin-types-server';
import type { SmlService, SmlSearchResult, SmlDocument, SmlTypeDefinition } from './types';
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
      search: async ({ keywords, size = 10, spaceId, esClient, request }) => {
        const rawResults = await searchSml({ keywords, size, spaceId, esClient, logger });
        return filterResultsByPermissions({
          searchResult: rawResults,
          request,
          securityAuthz: this.securityAuthz,
          logger,
        });
      },
      checkItemsAccess: async ({ items, spaceId, esClient, request }) => {
        return checkItemsAccess({
          items,
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
 * Check whether the current user has access to specific SML items.
 * Looks up each item's permissions from the index and batch-checks them.
 */
const checkItemsAccess = async ({
  items,
  spaceId,
  esClient,
  request,
  securityAuthz,
  logger,
}: {
  items: Array<{ id: string; type: string }>;
  spaceId: string;
  esClient: ElasticsearchClient;
  request: KibanaRequest;
  securityAuthz?: AuthorizationServiceSetup;
  logger: Logger;
}): Promise<Map<string, boolean>> => {
  const accessMap = new Map<string, boolean>();

  // When the security plugin is absent, grant access to all items.
  if (!securityAuthz) {
    for (const item of items) {
      accessMap.set(item.id, true);
    }
    return accessMap;
  }

  const ids = items.map((item) => item.id);

  let docPermissions: Map<string, string[]>;
  try {
    const response = await esClient.search<Pick<SmlDocument, 'id' | 'permissions'>>({
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
      for (const item of items) {
        accessMap.set(item.id, false);
      }
      return accessMap;
    }
    logger.warn(`SML items access check failed: ${(error as Error).message}`);
    for (const item of items) {
      accessMap.set(item.id, false);
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

  for (const item of items) {
    const perms = docPermissions.get(item.id);
    if (!perms) {
      accessMap.set(item.id, false);
      continue;
    }
    if (perms.length === 0) {
      accessMap.set(item.id, true);
      continue;
    }
    accessMap.set(
      item.id,
      perms.every((p) => authorizedPerms.has(p))
    );
  }

  return accessMap;
};

/**
 * Build the content query clause from an array of keywords.
 *
 * - `["*"]` or empty array → `match_all` (return everything)
 * - otherwise → `bool.should` with one `multi_match` per keyword (OR logic)
 */
const buildContentQuery = (keywords: string[]): Record<string, unknown> => {
  const filtered = keywords.map((k) => k.trim()).filter(Boolean);
  if (filtered.length === 0 || (filtered.length === 1 && filtered[0] === '*')) {
    return { match_all: {} };
  }
  return {
    bool: {
      should: filtered.map((keyword) => ({
        multi_match: {
          query: keyword,
          fields: ['title^2', 'content'],
          type: 'best_fields',
        },
      })),
      minimum_should_match: 1,
    },
  };
};

/**
 * Search the SML index. When the index hasn't been created yet,
 * the function returns empty results silently.
 */
const searchSml = async ({
  keywords,
  size,
  spaceId,
  esClient,
  logger,
}: {
  keywords: string[];
  size: number;
  spaceId: string;
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<{ results: SmlSearchResult[]; total: number }> => {
  logger.debug(
    `SML search: keywords=${JSON.stringify(
      keywords
    )}, size=${size}, spaceId='${spaceId}', index='${smlIndexName}'`
  );

  try {
    const contentQuery = buildContentQuery(keywords);

    const response = await esClient.search<SmlDocument>({
      index: smlIndexName,
      size,
      allow_no_indices: true,
      ignore_unavailable: true,
      query: {
        bool: {
          must: [contentQuery],
          filter: [
            {
              bool: {
                should: [{ term: { spaces: spaceId } }, { term: { spaces: '*' } }],
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
      _source: true,
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
          content: source.content ?? '',
          created_at: source.created_at ?? '',
          updated_at: source.updated_at ?? '',
          spaces: source.spaces ?? [],
          permissions: source.permissions ?? [],
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
  esClient,
  logger,
}: {
  ids: string[];
  spaceId: string;
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<Map<string, SmlDocument>> => {
  const docMap = new Map<string, SmlDocument>();
  if (ids.length === 0) return docMap;

  try {
    const response = await esClient.search<SmlDocument>({
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
      };
      docMap.set(doc.id, doc);
    }
  } catch (error) {
    if (!isNotFoundError(error)) {
      logger.warn(`SML getDocuments failed: ${(error as Error).message}`);
    }
  }

  return docMap;
};
