/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serverUnavailable } from '@hapi/boom';
import type { CoreSetup, ElasticsearchClient, IUiSettingsClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { orderBy } from 'lodash';
import { encode } from 'gpt-tokenizer';
import { isLockAcquisitionError } from '@kbn/lock-manager';
import { resourceNames } from '..';
import {
  Instruction,
  KnowledgeBaseEntry,
  KnowledgeBaseEntryRole,
  KnowledgeBaseType,
} from '../../../common/types';
import { getAccessQuery, getUserAccessFilters } from '../util/get_access_query';
import { getCategoryQuery } from '../util/get_category_query';
import { getSpaceQuery } from '../util/get_space_query';
import {
  getInferenceEndpointsForEmbedding,
  getKbModelStatus,
  isInferenceEndpointMissingOrUnavailable,
} from '../inference_endpoint';
import { recallFromSearchConnectors } from './recall_from_search_connectors';
import { ObservabilityAIAssistantPluginStartDependencies } from '../../types';
import { ObservabilityAIAssistantConfig } from '../../config';
import { hasKbWriteIndex } from './has_kb_index';
import { reIndexKnowledgeBaseWithLock } from './reindex_knowledge_base';
import { isSemanticTextUnsupportedError } from '../startup_migrations/run_startup_migrations';

interface Dependencies {
  core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
  esClient: {
    asInternalUser: ElasticsearchClient;
  };
  logger: Logger;
  config: ObservabilityAIAssistantConfig;
}

export interface RecalledEntry {
  id: string;
  title?: string;
  text: string;
  esScore: number | null;
  labels?: Record<string, string>;
}

function throwKnowledgeBaseNotReady(error: Error) {
  throw serverUnavailable(`Knowledge base is not ready yet: ${error.message}`);
}

export class KnowledgeBaseService {
  constructor(private readonly dependencies: Dependencies) {}

  private async recallFromKnowledgeBase({
    queries,
    categories,
    namespace,
    user,
  }: {
    queries: Array<{ text: string; boost?: number }>;
    categories?: string[];
    namespace: string;
    user?: { name: string };
  }): Promise<RecalledEntry[]> {
    const response = await this.dependencies.esClient.asInternalUser.search<
      Pick<KnowledgeBaseEntry, 'text' | 'labels' | 'title'> & { doc_id?: string }
    >({
      index: [resourceNames.writeIndexAlias.kb],
      query: {
        bool: {
          should: queries.map(({ text, boost = 1 }) => ({
            semantic: {
              field: 'semantic_text',
              query: text,
              boost,
            },
          })),
          filter: [
            ...getAccessQuery({
              user,
              namespace,
            }),
            ...getCategoryQuery({ categories }),

            // exclude user instructions
            { bool: { must_not: { term: { type: KnowledgeBaseType.UserInstruction } } } },
          ],
        },
      },
      size: 20,
      _source: {
        includes: ['text', 'labels', 'doc_id', 'title'],
      },
    });

    return response.hits.hits.map((hit) => ({
      text: hit._source?.text!,
      labels: hit._source?.labels,
      title: hit._source?.title ?? hit._source?.doc_id, // use `doc_id` as fallback title for backwards compatibility
      esScore: hit._score!,
      id: hit._id!,
    }));
  }

  recall = async ({
    user,
    queries,
    categories,
    namespace,
    esClient,
    uiSettingsClient,
    limit = {},
  }: {
    queries: Array<{ text: string; boost?: number }>;
    categories?: string[];
    user?: { name: string };
    namespace: string;
    esClient: { asCurrentUser: ElasticsearchClient; asInternalUser: ElasticsearchClient };
    uiSettingsClient: IUiSettingsClient;
    limit?: { tokens?: number; size?: number };
  }): Promise<RecalledEntry[]> => {
    if (!this.dependencies.config.enableKnowledgeBase) {
      return [];
    }

    this.dependencies.logger.debug(
      () => `Recalling entries from KB for queries: "${JSON.stringify(queries)}"`
    );

    const [documentsFromKb, documentsFromConnectors] = await Promise.all([
      this.recallFromKnowledgeBase({
        user,
        queries,
        categories,
        namespace,
      }).catch((error) => {
        if (isInferenceEndpointMissingOrUnavailable(error)) {
          throwKnowledgeBaseNotReady(error);
        }
        throw error;
      }),
      recallFromSearchConnectors({
        esClient,
        uiSettingsClient,
        queries,
        core: this.dependencies.core,
        logger: this.dependencies.logger,
      }).catch((error) => {
        this.dependencies.logger.error('Error getting data from search indices');
        this.dependencies.logger.debug(error);
        return [];
      }),
    ]);

    this.dependencies.logger.debug(
      `documentsFromKb: ${JSON.stringify(documentsFromKb.slice(0, 5), null, 2)}`
    );
    this.dependencies.logger.debug(
      `documentsFromConnectors: ${JSON.stringify(documentsFromConnectors.slice(0, 5), null, 2)}`
    );

    const sortedEntries = orderBy(
      documentsFromKb.concat(documentsFromConnectors),
      'esScore',
      'desc'
    ).slice(0, limit.size ?? 20);

    const maxTokens = limit.tokens ?? 4_000;

    let tokenCount = 0;

    const returnedEntries: RecalledEntry[] = [];

    for (const entry of sortedEntries) {
      returnedEntries.push(entry);
      tokenCount += encode(entry.text).length;
      if (tokenCount >= maxTokens) {
        break;
      }
    }

    const droppedEntries = sortedEntries.length - returnedEntries.length;
    if (droppedEntries > 0) {
      this.dependencies.logger.info(`Dropped ${droppedEntries} entries because of token limit`);
    }

    return returnedEntries;
  };

  getUserInstructions = async (
    namespace: string,
    user?: { name: string }
  ): Promise<Array<Instruction & { public?: boolean }>> => {
    if (!this.dependencies.config.enableKnowledgeBase) {
      return [];
    }

    const doesKbIndexExist = await hasKbWriteIndex({ esClient: this.dependencies.esClient });

    if (!doesKbIndexExist) {
      return [];
    }

    try {
      const response = await this.dependencies.esClient.asInternalUser.search<KnowledgeBaseEntry>({
        index: resourceNames.writeIndexAlias.kb,
        query: {
          bool: {
            filter: [
              {
                term: {
                  type: KnowledgeBaseType.UserInstruction,
                },
              },
              ...getAccessQuery({ user, namespace }),
            ],
          },
        },
        size: 500,
        _source: ['id', 'text', 'public'],
      });

      return response.hits.hits.map((hit) => ({
        id: hit._id!,
        text: hit._source?.text ?? '',
        public: hit._source?.public,
      }));
    } catch (error) {
      this.dependencies.logger.error('Failed to load instructions from knowledge base');
      this.dependencies.logger.error(error);
      return [];
    }
  };

  getEntries = async ({
    query,
    sortBy,
    sortDirection,
    namespace,
  }: {
    query?: string;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
    namespace: string;
  }): Promise<{ entries: KnowledgeBaseEntry[] }> => {
    if (!this.dependencies.config.enableKnowledgeBase) {
      return { entries: [] };
    }

    try {
      const response = await this.dependencies.esClient.asInternalUser.search<
        KnowledgeBaseEntry & { doc_id?: string }
      >({
        index: resourceNames.writeIndexAlias.kb,
        query: {
          bool: {
            filter: [
              // filter by search query
              ...(query
                ? [{ query_string: { query: `${query}*`, fields: ['doc_id', 'title'] } }]
                : []),
              {
                // exclude user instructions
                bool: {
                  must_not: { term: { type: KnowledgeBaseType.UserInstruction } },
                },
              },
              // filter by space
              ...getSpaceQuery({ namespace }),
            ],
          },
        },
        sort:
          sortBy === 'title'
            ? [{ ['title.keyword']: { order: sortDirection } }]
            : [{ [String(sortBy)]: { order: sortDirection } }],
        size: 500,
        _source: {
          excludes: ['confidence', 'is_correction'], // fields deprecated in https://github.com/elastic/kibana/pull/222814
        },
      });

      return {
        entries: response.hits.hits.map((hit) => ({
          ...hit._source!,
          title: hit._source!.title ?? hit._source!.doc_id, // use `doc_id` as fallback title for backwards compatibility
          role: hit._source!.role ?? KnowledgeBaseEntryRole.UserEntry,
          score: hit._score,
          id: hit._id!,
        })),
      };
    } catch (error) {
      if (isInferenceEndpointMissingOrUnavailable(error)) {
        throwKnowledgeBaseNotReady(error);
      }
      throw error;
    }
  };

  hasEntries = async () => {
    const response = await this.dependencies.esClient.asInternalUser.search<KnowledgeBaseEntry>({
      index: resourceNames.writeIndexAlias.kb,
      size: 0,
      track_total_hits: 1,
      terminate_after: 1,
    });

    const hitCount =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value ?? 0;

    return hitCount > 0;
  };

  getPersonalUserInstructionId = async ({
    isPublic,
    user,
    namespace,
  }: {
    isPublic: boolean;
    user?: { name: string; id?: string };
    namespace?: string;
  }) => {
    if (!this.dependencies.config.enableKnowledgeBase) {
      return null;
    }
    const res = await this.dependencies.esClient.asInternalUser.search<KnowledgeBaseEntry>({
      index: resourceNames.writeIndexAlias.kb,
      query: {
        bool: {
          filter: [
            { term: { type: KnowledgeBaseType.UserInstruction } },
            { term: { public: isPublic } },
            { term: { namespace } },
            {
              bool: {
                should: [...getUserAccessFilters(user)],
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
      size: 1,
      _source: false,
    });

    return res.hits.hits[0]?._id;
  };

  getUuidFromDocId = async ({
    docId,
    user,
    namespace,
  }: {
    docId: string;
    user?: { name: string; id?: string };
    namespace?: string;
  }) => {
    const query = {
      bool: {
        filter: [
          { term: { doc_id: docId } },

          // exclude user instructions
          { bool: { must_not: { term: { type: KnowledgeBaseType.UserInstruction } } } },

          // restrict access to user's own entries
          ...getAccessQuery({ user, namespace }),
        ],
      },
    };

    const response = await this.dependencies.esClient.asInternalUser.search<KnowledgeBaseEntry>({
      size: 1,
      index: resourceNames.writeIndexAlias.kb,
      query,
      _source: false,
    });

    return response.hits.hits[0]?._id;
  };

  addEntry = async ({
    entry: { id, ...doc },
    user,
    namespace,
  }: {
    entry: Omit<KnowledgeBaseEntry, '@timestamp'>;
    user?: { name: string; id?: string };
    namespace: string;
  }): Promise<void> => {
    if (!this.dependencies.config.enableKnowledgeBase) {
      return;
    }

    try {
      const indexResult = await this.dependencies.esClient.asInternalUser.index<
        Omit<KnowledgeBaseEntry, 'id'> & { namespace: string }
      >({
        index: resourceNames.writeIndexAlias.kb,
        id,
        document: {
          '@timestamp': new Date().toISOString(),
          ...doc,
          ...(doc.text ? { semantic_text: doc.text } : {}),
          user,
          namespace,
        },
        refresh: 'wait_for',
      });

      this.dependencies.logger.debug(
        `Entry added to knowledge base. title = "${doc.title}", user = "${user?.name}, namespace = "${namespace}", index = ${indexResult._index}, id = ${indexResult._id}`
      );
    } catch (error) {
      this.dependencies.logger.error(`Failed to add entry to knowledge base ${error}`);
      if (isInferenceEndpointMissingOrUnavailable(error)) {
        throwKnowledgeBaseNotReady(error);
      }

      if (isSemanticTextUnsupportedError(error)) {
        reIndexKnowledgeBaseWithLock({
          core: this.dependencies.core,
          logger: this.dependencies.logger,
          esClient: this.dependencies.esClient,
        }).catch((e) => {
          if (isLockAcquisitionError(e)) {
            this.dependencies.logger.info(`Re-indexing operation is already in progress`);
            return;
          }
          this.dependencies.logger.error(`Failed to re-index knowledge base: ${e.message}`);
        });

        throw serverUnavailable(
          `The index "${resourceNames.writeIndexAlias.kb}" does not support semantic text and must be reindexed. This re-index operation has been scheduled and will be started automatically. Please try again later.`
        );
      }

      throw error;
    }
  };

  addBulkEntries = async ({
    entries,
    user,
    namespace,
  }: {
    entries: Array<Omit<KnowledgeBaseEntry, '@timestamp'>>;
    user?: { name: string; id?: string };
    namespace: string;
  }): Promise<void> => {
    if (!this.dependencies.config.enableKnowledgeBase) {
      return;
    }

    try {
      const result = await this.dependencies.esClient.asInternalUser.helpers.bulk({
        onDocument(doc) {
          return [
            { index: { _index: resourceNames.writeIndexAlias.kb, _id: doc.id } },
            {
              '@timestamp': new Date().toISOString(),
              ...doc,
              ...(doc.text ? { semantic_text: doc.text } : {}),
              user,
              namespace,
            },
          ];
        },
        onDrop: (doc) => {
          this.dependencies.logger.error(
            `Failed ingesting document: ${doc.error?.reason || 'unknown reason'}`
          );
        },
        datasource: entries,
        refresh: 'wait_for',
        concurrency: 3,
        flushBytes: 100 * 1024,
        flushInterval: 1000,
        retries: 5,
      });

      if (result.failed > 0) {
        throw Error(`Failed ingesting ${result.failed} documents.`);
      }

      this.dependencies.logger.debug(
        `Successfully added ${result.successful} entries to the knowledge base`
      );
    } catch (error) {
      this.dependencies.logger.error(`Failed to add entries to the knowledge base: ${error}`);
      if (isInferenceEndpointMissingOrUnavailable(error)) {
        throwKnowledgeBaseNotReady(error);
      }
      throw error;
    }
  };

  deleteEntry = async ({ id }: { id: string }): Promise<void> => {
    try {
      await this.dependencies.esClient.asInternalUser.delete({
        index: resourceNames.writeIndexAlias.kb,
        id,
        refresh: 'wait_for',
      });

      return Promise.resolve();
    } catch (error) {
      if (isInferenceEndpointMissingOrUnavailable(error)) {
        throwKnowledgeBaseNotReady(error);
      }
      throw error;
    }
  };

  getModelStatus = async () => {
    return getKbModelStatus({
      core: this.dependencies.core,
      esClient: this.dependencies.esClient,
      logger: this.dependencies.logger,
      config: this.dependencies.config,
    });
  };

  getInferenceEndpointsForEmbedding = async () => {
    const { inferenceEndpoints } = await getInferenceEndpointsForEmbedding({
      esClient: this.dependencies.esClient,
      logger: this.dependencies.logger,
    });

    return inferenceEndpoints;
  };
}
