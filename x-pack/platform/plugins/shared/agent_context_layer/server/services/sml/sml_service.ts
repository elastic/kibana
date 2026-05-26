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
  SmlSearchResult,
  SmlDocument,
  SmlDocumentInput,
  SmlTypeDefinition,
  SmlUpsertResult,
  SmlSearchFilters,
} from './types';
import { createSmlTypeRegistry, type SmlTypeRegistry } from './sml_type_registry';
import { createSmlIndexer, type SmlIndexer } from './sml_indexer';
import { SmlCrawlerImpl } from './sml_crawler';
import type { SmlCrawler } from './types';
import { smlIndexName, createSmlStorage } from './sml_storage';
import { SmlResultWindowExceededError } from './sml_errors';

// ES client usage pattern in this module:
// - Read operations (search, get, list, checkAccess) use `esClient.asInternalUser` directly with
//   `allow_no_indices: true` / `ignore_unavailable: true` so they silently handle a missing index.
// - Write operations (upsert, delete) use `createSmlStorage` / `smlClient` so that
//   StorageIndexAdapter auto-creates the index on first write.

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
      search: async ({ query, size = 10, spaceId, esClient, request, skipContent, filters }) => {
        const rawResults = await searchSml({
          query,
          size,
          spaceId,
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
      getDocuments: async ({ ids, spaceId, esClient }) => {
        return getDocumentsByIds({ ids, spaceId, esClient, logger });
      },
      listDocuments: async ({ spaceId, esClient, page, perPage, type, originId }) => {
        return listDocuments({
          spaceId,
          esClient,
          logger,
          page,
          perPage,
          type,
          originId,
        });
      },
      upsertDocument: async ({ id, spaceId, document, esClient }) => {
        return upsertDocument({ id, spaceId, document, esClient, logger });
      },
      deleteDocument: async ({ id, spaceId, esClient }) => {
        return deleteDocument({ id, spaceId, esClient, logger });
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

const isResultWindowExceededError = (error: unknown): boolean => {
  if (!(error instanceof errors.ResponseError) || error.statusCode !== 400) return false;
  const body = error.body as
    | {
        error?: {
          reason?: string;
          caused_by?: { reason?: string };
          root_cause?: Array<{ reason?: string }>;
        };
      }
    | undefined;
  const reasons = [
    body?.error?.reason,
    body?.error?.caused_by?.reason,
    ...(body?.error?.root_cause?.map((rc) => rc.reason) ?? []),
  ];
  return reasons.some(
    (reason) => typeof reason === 'string' && reason.includes('Result window is too large')
  );
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
  esClient,
  logger,
  skipContent,
  filters,
}: {
  query: string;
  size: number;
  spaceId: string;
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
          user_id: source.user_id,
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

/**
 * Fetch a single SML document by id, scoped to a space.
 * Returns `undefined` when the document does not exist or is not in the space.
 */
const getDocumentById = async ({
  id,
  spaceId,
  esClient,
  logger,
}: {
  id: string;
  spaceId: string;
  esClient: IScopedClusterClient;
  logger: Logger;
}): Promise<SmlDocument | undefined> => {
  try {
    const response = await esClient.asInternalUser.search<SmlDocument>({
      index: smlIndexName,
      size: 1,
      allow_no_indices: true,
      ignore_unavailable: true,
      query: {
        bool: {
          filter: [
            { term: { id } },
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

    const hit = response.hits.hits[0];
    if (!hit?._source) return undefined;

    const source = hit._source;
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
    };
  } catch (error) {
    if (isNotFoundError(error)) {
      return undefined;
    }
    logger.warn(`SML getDocument failed: ${(error as Error).message}`);
    throw error;
  }
};

/**
 * List SML documents in a space with optional filters and pagination.
 *
 * Pagination follows the standard Kibana convention (`page` is 1-based,
 * `per_page` bounds the page size).
 */
const listDocuments = async ({
  spaceId,
  esClient,
  logger,
  page = 1,
  perPage = 20,
  type,
  originId,
}: {
  spaceId: string;
  esClient: IScopedClusterClient;
  logger: Logger;
  page?: number;
  perPage?: number;
  type?: string;
  originId?: string;
}): Promise<{ total: number; results: SmlDocument[] }> => {
  const filters: Array<Record<string, unknown>> = [
    {
      bool: {
        should: [{ term: { spaces: spaceId } }, { term: { spaces: '*' } }],
        minimum_should_match: 1,
      },
    },
  ];
  if (type) {
    filters.push({ term: { type } });
  }
  if (originId) {
    filters.push({ term: { origin_id: originId } });
  }

  try {
    const response = await esClient.asInternalUser.search<SmlDocument>({
      index: smlIndexName,
      from: (page - 1) * perPage,
      size: perPage,
      allow_no_indices: true,
      ignore_unavailable: true,
      track_total_hits: true,
      query: {
        bool: {
          filter: filters,
        },
      },
      sort: [{ updated_at: { order: 'desc' } }],
    });

    const total =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value ?? 0;

    const results: SmlDocument[] = response.hits.hits
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
        };
      });

    return { total, results };
  } catch (error) {
    if (isNotFoundError(error)) {
      return { total: 0, results: [] };
    }
    if (isResultWindowExceededError(error)) {
      const responseError = error as errors.ResponseError;
      const body = responseError.body as
        | { error?: { root_cause?: Array<{ reason?: string }>; reason?: string } }
        | undefined;
      const reason =
        body?.error?.root_cause?.[0]?.reason ?? body?.error?.reason ?? responseError.message;
      throw new SmlResultWindowExceededError(reason);
    }
    logger.warn(`SML listDocuments failed: ${(error as Error).message}`);
    throw error;
  }
};

/**
 * Upsert an SML document by id, scoped to a space.
 *
 * On create, `spaces` is set to `[spaceId]`. On update, `created_at` and the
 * existing `spaces` are preserved (callers cannot widen or narrow space
 * membership through this endpoint), and `updated_at` is refreshed.
 *
 * Returns `null` when a document with this id exists but is not visible from
 * `spaceId` — callers cannot clobber documents in other spaces.
 */
const upsertDocument = async ({
  id,
  spaceId,
  document,
  esClient,
  logger,
}: {
  id: string;
  spaceId: string;
  document: SmlDocumentInput;
  esClient: IScopedClusterClient;
  logger: Logger;
}): Promise<SmlUpsertResult | null> => {
  // TODO: Implement optimistic concurrency using _seq_no/_primary_term to prevent lost-update
  // races. The current get-then-index pattern allows two concurrent upserts to silently overwrite
  // each other. A fix should use esClient.asInternalUser.get() (which reliably returns
  // _seq_no/_primary_term) and pass if_seq_no/if_primary_term to the index call.
  // Note: StorageIndexAdapter.get() uses search internally and does not request
  // seq_no_primary_term, so _seq_no is unreliable via that path.

  // We use smlClient.get() rather than the space-aware getDocumentById() here intentionally:
  // we need to detect documents that exist in another space (to block cross-space overwrites).
  // getDocumentById() would return undefined for those, causing us to silently overwrite them.
  const internalEsClient = esClient.asInternalUser;
  const storage = createSmlStorage({ logger, esClient: internalEsClient });
  const smlClient = storage.getClient();

  let existing: SmlDocument | undefined;
  try {
    const existingResponse = await smlClient.get({ id });
    if (existingResponse?.found && existingResponse._source) {
      existing = existingResponse._source;
    }
  } catch (error) {
    if (!isNotFoundError(error)) {
      logger.warn(`SML upsertDocument lookup failed: ${(error as Error).message}`);
      throw error;
    }
  }

  if (existing && !isVisibleInSpace(existing.spaces, spaceId)) {
    return null;
  }

  const now = new Date().toISOString();
  const created = !existing;
  const fullDocument: SmlDocument = {
    id,
    type: document.type,
    title: document.title,
    origin_id: document.origin_id,
    content: document.content,
    created_at: existing?.created_at ?? now,
    updated_at: now,
    spaces: existing?.spaces ?? [spaceId],
    permissions: document.permissions ?? [],
  };

  await smlClient.index({ id, document: fullDocument });

  return { document: fullDocument, created };
};

const isVisibleInSpace = (spaces: string[] | undefined, spaceId: string): boolean => {
  if (!spaces || spaces.length === 0) return false;
  return spaces.includes(spaceId) || spaces.includes('*');
};

/**
 * Delete an SML document by id, scoped to a space.
 *
 * The space scope is enforced via a lookup before the delete: documents
 * that exist but are not visible in `spaceId` are reported as not found.
 * Returns `true` when a document was deleted, `false` otherwise.
 */
const deleteDocument = async ({
  id,
  spaceId,
  esClient,
  logger,
}: {
  id: string;
  spaceId: string;
  esClient: IScopedClusterClient;
  logger: Logger;
}): Promise<boolean> => {
  const existing = await getDocumentById({ id, spaceId, esClient, logger });
  if (!existing) {
    return false;
  }

  const internalEsClient = esClient.asInternalUser;
  const storage = createSmlStorage({ logger, esClient: internalEsClient });
  const smlClient = storage.getClient();

  try {
    const response = await smlClient.delete({ id });
    return response.result === 'deleted';
  } catch (error) {
    if (isNotFoundError(error)) {
      return false;
    }
    logger.warn(`SML deleteDocument failed: ${(error as Error).message}`);
    throw error;
  }
};
