/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import type { AuthorizationServiceSetup } from '@kbn/security-plugin-types-server';
import type {
  SmlTypeDefinition,
  SmlSearchResult,
  SmlAutocompleteResult,
  SmlDocument,
  SmlSearchFilters,
  SmlSearchConstraints,
  SmlIndexerParams,
  SmlIndexerDeleteAttachmentParams,
} from '@kbn/agent-builder-server';
import { createSmlTypeRegistry, type SmlTypeRegistry } from './type_registry';
import { createSmlIndexer, type SmlIndexer } from './indexer';
import {
  searchSml,
  autocompleteSml,
  checkItemsAccess,
  getDocumentsByIds,
  listDocuments,
  findByOrigin,
  findByOriginAcrossSpaces,
  filterResultsByPermissions,
} from './query';
import { resolveSmlAttachItems, type SmlResolvedItemResult } from './resolve_sml_attach_items';

export interface AgentBuilderSmlServiceSetup {
  /**
   * Register an SML type definition.
   * Should be called during plugin setup.
   */
  registerType: (definition: SmlTypeDefinition) => void;
}

export interface AgentBuilderSmlServiceStartDeps {
  logger: Logger;
  securityAuthz?: AuthorizationServiceSetup;
}

export interface AgentBuilderSmlServiceStart {
  search: (params: {
    query: string;
    size?: number;
    fields?: string[];
    spaceId: string;
    esClient: IScopedClusterClient;
    request: KibanaRequest;
    constraints?: SmlSearchConstraints;
    filters?: SmlSearchFilters;
  }) => Promise<{ results: SmlSearchResult[] }>;
  autocomplete: (params: {
    query: string;
    size?: number;
    spaceId: string;
    esClient: IScopedClusterClient;
    request: KibanaRequest;
    constraints?: SmlSearchConstraints;
    filters?: SmlSearchFilters;
  }) => Promise<{ results: SmlAutocompleteResult[] }>;
  checkItemsAccess: (params: {
    ids: string[];
    spaceId: string;
    esClient: IScopedClusterClient;
    request: KibanaRequest;
  }) => Promise<Map<string, boolean>>;
  indexAttachment: (params: SmlIndexerParams) => Promise<void>;
  deleteAttachment: (params: SmlIndexerDeleteAttachmentParams) => Promise<void>;
  getDocuments: (params: {
    ids: string[];
    spaceId: string;
    esClient: IScopedClusterClient;
  }) => Promise<Map<string, SmlDocument>>;
  listDocuments: (params: {
    spaceId: string;
    esClient: IScopedClusterClient;
    page?: number;
    perPage?: number;
    type?: string;
    originUri?: string;
    tags?: string[];
  }) => Promise<{ total: number; results: SmlDocument[] }>;
  findByOrigin: (params: {
    type: string;
    originId: string;
    spaceId: string;
    esClient: IScopedClusterClient;
  }) => Promise<SmlDocument[]>;
  findByOriginAcrossSpaces: (params: {
    type: string;
    originId: string;
    esClient: IScopedClusterClient;
  }) => Promise<SmlDocument[]>;
  getTypeDefinition: (typeId: string) => SmlTypeDefinition | undefined;
  listTypeDefinitions: () => SmlTypeDefinition[];
  resolveSmlAttachItems: (params: {
    chunkIds: string[];
    esClient: IScopedClusterClient;
    request: KibanaRequest;
    spaceId: string;
    savedObjectsClient: SavedObjectsClientContract;
    logger: Logger;
  }) => Promise<SmlResolvedItemResult[]>;
}

export interface AgentBuilderSmlServiceInstance {
  setup: (deps: { logger: Logger }) => AgentBuilderSmlServiceSetup;
  start: (deps: AgentBuilderSmlServiceStartDeps) => AgentBuilderSmlServiceStart;
}

export const createAgentBuilderSmlService = (): AgentBuilderSmlServiceInstance => {
  return new AgentBuilderSmlServiceImpl();
};

class AgentBuilderSmlServiceImpl implements AgentBuilderSmlServiceInstance {
  private registry: SmlTypeRegistry;
  private indexer?: SmlIndexer;
  private securityAuthz?: AuthorizationServiceSetup;

  constructor() {
    this.registry = createSmlTypeRegistry();
  }

  setup({ logger }: { logger: Logger }): AgentBuilderSmlServiceSetup {
    return {
      registerType: (definition: SmlTypeDefinition) => {
        this.registry.register(definition);
        logger.info(`Registered SML type: ${definition.id}`);
      },
    };
  }

  start({ logger, securityAuthz }: AgentBuilderSmlServiceStartDeps): AgentBuilderSmlServiceStart {
    this.securityAuthz = securityAuthz;
    if (!securityAuthz) {
      logger.warn(
        'SML service started without security authorization — permission checks are disabled (open access)'
      );
    }
    this.indexer = createSmlIndexer({ registry: this.registry, logger: logger.get('indexer') });

    return {
      search: async ({
        query,
        size = 10,
        fields,
        spaceId,
        esClient,
        request,
        constraints,
        filters,
      }) => {
        return searchSml({
          query,
          size,
          fields,
          spaceId,
          esClient,
          request,
          securityAuthz: this.securityAuthz,
          logger,
          constraints,
          filters,
        });
      },
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
      listDocuments: async ({ spaceId, esClient, page, perPage, type, originUri, tags }) => {
        return listDocuments({
          spaceId,
          esClient,
          logger,
          page,
          perPage,
          type,
          originId: originUri,
          tags,
        });
      },
      findByOrigin: async ({ type, originId, spaceId, esClient }) => {
        return findByOrigin({ type, originId, spaceId, esClient, logger });
      },
      findByOriginAcrossSpaces: async ({ type, originId, esClient }) => {
        return findByOriginAcrossSpaces({ type, originId, esClient, logger });
      },
      getTypeDefinition: (typeId: string) => {
        return this.registry.get(typeId);
      },
      listTypeDefinitions: () => {
        return this.registry.list();
      },
      resolveSmlAttachItems: (params) => {
        return resolveSmlAttachItems({
          ...params,
          checkItemsAccess: (checkParams) =>
            checkItemsAccess({
              ...checkParams,
              securityAuthz: this.securityAuthz,
              logger,
            }),
          getDocuments: (getParams) => getDocumentsByIds({ ...getParams, logger }),
          getTypeDefinition: (typeId: string) => this.registry.get(typeId),
        });
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
