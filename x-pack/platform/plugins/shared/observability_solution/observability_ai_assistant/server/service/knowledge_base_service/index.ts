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
import { resourceNames } from '..';
import {
  Instruction,
  KnowledgeBaseEntry,
  KnowledgeBaseEntryRole,
  KnowledgeBaseType,
} from '../../../common/types';
import { getAccessQuery, getUserAccessFilters } from '../util/get_access_query';
import { getCategoryQuery } from '../util/get_category_query';
import {
  createInferenceEndpoint,
  deleteInferenceEndpoint,
  getElserModelStatus,
  isInferenceEndpointMissingOrUnavailable,
} from '../inference_endpoint';
import { recallFromSearchConnectors } from './recall_from_search_connectors';
import { ObservabilityAIAssistantPluginStartDependencies } from '../../types';
import { ObservabilityAIAssistantConfig } from '../../config';

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
  text: string;
  score: number | null;
  is_correction?: boolean;
  labels?: Record<string, string>;
}

function throwKnowledgeBaseNotReady(body: any) {
  throw serverUnavailable(`Knowledge base is not ready yet`, body);
}

export class KnowledgeBaseService {
  constructor(private readonly dependencies: Dependencies) {}

  async setup(
    esClient: {
      asCurrentUser: ElasticsearchClient;
      asInternalUser: ElasticsearchClient;
    },
    modelId: string
  ) {
    await deleteInferenceEndpoint({ esClient }).catch((e) => {}); // ensure existing inference endpoint is deleted
    return createInferenceEndpoint({ esClient, logger: this.dependencies.logger, modelId });
  }

  async reset(esClient: { asCurrentUser: ElasticsearchClient }) {
    try {
      await deleteInferenceEndpoint({ esClient });
    } catch (error) {
      if (isInferenceEndpointMissingOrUnavailable(error)) {
        return;
      }
      throw error;
    }
  }

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
      Pick<KnowledgeBaseEntry, 'text' | 'is_correction' | 'labels' | 'title'> & { doc_id?: string }
    >({
      index: [resourceNames.aliases.kb],
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
        includes: ['text', 'is_correction', 'labels', 'doc_id', 'title'],
      },
    });

    return response.hits.hits.map((hit) => ({
      text: hit._source?.text!,
      is_correction: hit._source?.is_correction,
      labels: hit._source?.labels,
      title: hit._source?.title ?? hit._source?.doc_id, // use `doc_id` as fallback title for backwards compatibility
      score: hit._score!,
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
          throwKnowledgeBaseNotReady(error.body);
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
        this.dependencies.logger.debug('Error getting data from search indices');
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
      'score',
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
    try {
      const response = await this.dependencies.esClient.asInternalUser.search<KnowledgeBaseEntry>({
        index: resourceNames.aliases.kb,
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
  }: {
    query?: string;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
  }): Promise<{ entries: KnowledgeBaseEntry[] }> => {
    if (!this.dependencies.config.enableKnowledgeBase) {
      return { entries: [] };
    }
    try {
      const response = await this.dependencies.esClient.asInternalUser.search<
        KnowledgeBaseEntry & { doc_id?: string }
      >({
        index: resourceNames.aliases.kb,
        query: {
          bool: {
            filter: [
              // filter by search query
              ...(query
                ? [{ query_string: { query: `${query}*`, fields: ['doc_id', 'title'] } }]
                : []),
              {
                // exclude user instructions
                bool: { must_not: { term: { type: KnowledgeBaseType.UserInstruction } } },
              },
            ],
          },
        },
        sort:
          sortBy === 'title'
            ? [
                { ['title.keyword']: { order: sortDirection } },
                { doc_id: { order: sortDirection } }, // sort by doc_id for backwards compatibility
              ]
            : [{ [String(sortBy)]: { order: sortDirection } }],
        size: 500,
        _source: {
          includes: [
            'title',
            'doc_id',
            'text',
            'is_correction',
            'labels',
            'confidence',
            'public',
            '@timestamp',
            'role',
            'user.name',
            'type',
          ],
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
        throwKnowledgeBaseNotReady(error.body);
      }
      throw error;
    }
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
      index: resourceNames.aliases.kb,
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
      index: resourceNames.aliases.kb,
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
      await this.dependencies.esClient.asInternalUser.index({
        index: resourceNames.aliases.kb,
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
    } catch (error) {
      if (isInferenceEndpointMissingOrUnavailable(error)) {
        throwKnowledgeBaseNotReady(error.body);
      }
      throw error;
    }
  };

  deleteEntry = async ({ id }: { id: string }): Promise<void> => {
    try {
      await this.dependencies.esClient.asInternalUser.delete({
        index: resourceNames.aliases.kb,
        id,
        refresh: 'wait_for',
      });

      return Promise.resolve();
    } catch (error) {
      if (isInferenceEndpointMissingOrUnavailable(error)) {
        throwKnowledgeBaseNotReady(error.body);
      }
      throw error;
    }
  };

  getStatus = async () => {
    return getElserModelStatus({
      esClient: this.dependencies.esClient,
      logger: this.dependencies.logger,
      config: this.dependencies.config,
    });
  };
}
