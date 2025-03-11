/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serverUnavailable } from '@hapi/boom';
import type { CoreSetup, ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { resourceNames } from '..';
import {
  Instruction,
  KnowledgeBaseEntry,
  KnowledgeBaseEntryRole,
  KnowledgeBaseType,
} from '../../../common/types';
import { ObservabilityAIAssistantConfig } from '../../config';
import { ObservabilityAIAssistantPluginStartDependencies } from '../../types';
import {
  createInferenceEndpoint,
  deleteInferenceEndpoint,
  isInferenceEndpointMissingOrUnavailable,
} from '../inference_endpoint';
import { scheduleKbSemanticTextMigrationTask } from '../task_manager_definitions/register_kb_semantic_text_migration_task';
import { getAccessQuery, getUserAccessQuery } from '../util/get_access_query';
import {
  isKnowledgeBaseIndexWriteBlocked,
  isSemanticTextUnsupportedError,
} from './reindex_knowledge_base';

interface Dependencies {
  core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
  esClient: {
    asInternalUser: ElasticsearchClient;
  };
  logger: Logger;
  config: ObservabilityAIAssistantConfig;
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

  getUserInstructions = async (
    namespace: string,
    user: { name: string; id?: string } | null
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
    user: { name: string; id?: string } | null;
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
                should: [getUserAccessQuery(user)],
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
    user: { name: string; id?: string } | null;
    namespace: string | null;
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
    user: { name: string; id?: string } | null;
    namespace: string;
  }): Promise<void> => {
    if (!this.dependencies.config.enableKnowledgeBase) {
      return;
    }

    try {
      await this.dependencies.esClient.asInternalUser.index<
        Omit<KnowledgeBaseEntry, 'id'> & { namespace: string }
      >({
        index: resourceNames.aliases.kb,
        id,
        document: {
          '@timestamp': new Date().toISOString(),
          ...doc,
          ...(doc.text ? { semantic_text: doc.text } : {}),
          ...(user ? { user } : {}),
          namespace,
        },
        refresh: 'wait_for',
      });
      this.dependencies.logger.debug(`Entry added to knowledge base`);
    } catch (error) {
      this.dependencies.logger.debug(`Failed to add entry to knowledge base ${error}`);
      if (isInferenceEndpointMissingOrUnavailable(error)) {
        throwKnowledgeBaseNotReady(error.body);
      }

      if (isSemanticTextUnsupportedError(error)) {
        this.dependencies.core
          .getStartServices()
          .then(([_, pluginsStart]) => {
            return scheduleKbSemanticTextMigrationTask({
              taskManager: pluginsStart.taskManager,
              logger: this.dependencies.logger,
              runSoon: true,
            });
          })
          .catch((e) => {
            this.dependencies.logger.error(
              `Failed to schedule knowledge base semantic text migration task: ${e}`
            );
          });

        throw serverUnavailable(
          'The knowledge base is currently being re-indexed. Please try again later'
        );
      }

      if (isKnowledgeBaseIndexWriteBlocked(error)) {
        throw new Error(
          `Writes to the knowledge base are currently blocked due to an Elasticsearch write index block. This is most likely due to an ongoing re-indexing operation. Please try again later. Error: ${error.message}`
        );
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
}
