/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { CoreSetup } from '@kbn/core/server';
import type { AggregationsCardinalityAggregate } from '@elastic/elasticsearch/lib/api/types';
import { resourceNames } from '../service';

interface ObservabilityAIAssistantUsage {
  knowledge_base: {
    users_with_any_entries: number;
    users_with_global_entries: number;
    users_with_global_entries_user_created: number;
    users_with_global_entries_assistant_created: number;
    users_with_private_entries: number;
    users_with_private_entries_user_created: number;
    users_with_private_entries_assistant_created: number;
    users_with_user_instructions: number;
  };
  conversations: {
    users_with_archived_conversations: number;
    users_with_private_conversations: number;
    users_with_shared_conversations: number;
  };
}

export function registerUsageCollector(
  usageCollection: UsageCollectionSetup | undefined,
  core: CoreSetup
): void {
  if (!usageCollection) {
    return;
  }

  const usageCollector = usageCollection.makeUsageCollector<ObservabilityAIAssistantUsage>({
    type: 'observability_ai_assistant',
    isReady: () => true,
    schema: {
      knowledge_base: {
        users_with_any_entries: {
          type: 'long',
          _meta: {
            description: 'Number of unique users with any knowledge base entries',
          },
        },
        users_with_global_entries: {
          type: 'long',
          _meta: {
            description: 'Number of users with global knowledge base entries',
          },
        },
        users_with_global_entries_user_created: {
          type: 'long',
          _meta: {
            description: 'Number of users with global knowledge base entries created by user',
          },
        },
        users_with_global_entries_assistant_created: {
          type: 'long',
          _meta: {
            description: 'Number of users with global knowledge base entries created by assistant',
          },
        },
        users_with_private_entries: {
          type: 'long',
          _meta: {
            description: 'Number of users with private knowledge base entries',
          },
        },
        users_with_private_entries_user_created: {
          type: 'long',
          _meta: {
            description: 'Number of users with private knowledge base entries created by user',
          },
        },
        users_with_private_entries_assistant_created: {
          type: 'long',
          _meta: {
            description: 'Number of users with private knowledge base entries created by assistant',
          },
        },
        users_with_user_instructions: {
          type: 'long',
          _meta: {
            description: 'Number of users who have configured custom user instructions',
          },
        },
      },
      conversations: {
        users_with_archived_conversations: {
          type: 'long',
          _meta: {
            description: 'Number of users with archived conversations',
          },
        },
        users_with_private_conversations: {
          type: 'long',
          _meta: {
            description: 'Number of users with private conversations',
          },
        },
        users_with_shared_conversations: {
          type: 'long',
          _meta: {
            description: 'Number of users with shared conversations',
          },
        },
      },
    },
    fetch: async () => {
      const [coreStart] = await core.getStartServices();
      const esClient = coreStart.elasticsearch.client.asInternalUser;
      const kbIndex = resourceNames.indexPatterns.kb;
      const conversationsIndex = resourceNames.indexPatterns.conversations;

      const kbResponse = await esClient.search({
        index: kbIndex,
        size: 0,
        query: {
          bool: {
            filter: [{ exists: { field: 'user.id' } }],
          },
        },
        aggs: {
          any_entries: {
            cardinality: { field: 'user.id' },
          },
          global_entries: {
            filter: { term: { public: true } },
            aggs: {
              unique_users: {
                cardinality: { field: 'user.id' },
              },
            },
          },
          global_entries_user_created: {
            filter: {
              bool: {
                filter: [{ term: { public: true } }, { term: { role: 'user_entry' } }],
              },
            },
            aggs: {
              unique_users: {
                cardinality: { field: 'user.id' },
              },
            },
          },
          global_entries_assistant_created: {
            filter: {
              bool: {
                filter: [{ term: { public: true } }, { term: { role: 'assistant_summarization' } }],
              },
            },
            aggs: {
              unique_users: {
                cardinality: { field: 'user.id' },
              },
            },
          },
          private_entries: {
            filter: {
              bool: {
                filter: [{ term: { public: false } }],
                must_not: [{ term: { type: 'user_instruction' } }],
              },
            },
            aggs: {
              unique_users: {
                cardinality: { field: 'user.id' },
              },
            },
          },
          private_entries_user_created: {
            filter: {
              bool: {
                filter: [{ term: { public: false } }, { term: { role: 'user_entry' } }],
                must_not: [{ term: { type: 'user_instruction' } }],
              },
            },
            aggs: {
              unique_users: {
                cardinality: { field: 'user.id' },
              },
            },
          },
          private_entries_assistant_created: {
            filter: {
              bool: {
                filter: [
                  { term: { public: false } },
                  { term: { role: 'assistant_summarization' } },
                ],
              },
            },
            aggs: {
              unique_users: {
                cardinality: { field: 'user.id' },
              },
            },
          },
          user_instructions: {
            filter: { term: { type: 'user_instruction' } },
            aggs: {
              unique_users: {
                cardinality: { field: 'user.id' },
              },
            },
          },
        },
      });

      const conversationsResponse = await esClient.search({
        index: conversationsIndex,
        size: 0,
        query: {
          bool: {
            filter: [{ exists: { field: 'user.id' } }],
          },
        },
        aggs: {
          archived: {
            filter: { term: { archived: true } },
            aggs: {
              unique_users: {
                cardinality: { field: 'user.id' },
              },
            },
          },
          private: {
            filter: { term: { public: false } },
            aggs: {
              unique_users: {
                cardinality: { field: 'user.id' },
              },
            },
          },
          shared: {
            filter: { term: { public: true } },
            aggs: {
              unique_users: {
                cardinality: { field: 'user.id' },
              },
            },
          },
        },
      });

      return {
        knowledge_base: {
          users_with_any_entries:
            (kbResponse.aggregations?.any_entries as AggregationsCardinalityAggregate)?.value ?? 0,
          users_with_global_entries:
            (
              (kbResponse.aggregations?.global_entries as any)
                ?.unique_users as AggregationsCardinalityAggregate
            )?.value ?? 0,
          users_with_global_entries_user_created:
            (
              (kbResponse.aggregations?.global_entries_user_created as any)
                ?.unique_users as AggregationsCardinalityAggregate
            )?.value ?? 0,
          users_with_global_entries_assistant_created:
            (
              (kbResponse.aggregations?.global_entries_assistant_created as any)
                ?.unique_users as AggregationsCardinalityAggregate
            )?.value ?? 0,
          users_with_private_entries:
            (
              (kbResponse.aggregations?.private_entries as any)
                ?.unique_users as AggregationsCardinalityAggregate
            )?.value ?? 0,
          users_with_private_entries_user_created:
            (
              (kbResponse.aggregations?.private_entries_user_created as any)
                ?.unique_users as AggregationsCardinalityAggregate
            )?.value ?? 0,
          users_with_private_entries_assistant_created:
            (
              (kbResponse.aggregations?.private_entries_assistant_created as any)
                ?.unique_users as AggregationsCardinalityAggregate
            )?.value ?? 0,
          users_with_user_instructions:
            (
              (kbResponse.aggregations?.user_instructions as any)
                ?.unique_users as AggregationsCardinalityAggregate
            )?.value ?? 0,
        },
        conversations: {
          users_with_archived_conversations:
            (
              (conversationsResponse.aggregations?.archived as any)
                ?.unique_users as AggregationsCardinalityAggregate
            )?.value ?? 0,
          users_with_private_conversations:
            (
              (conversationsResponse.aggregations?.private as any)
                ?.unique_users as AggregationsCardinalityAggregate
            )?.value ?? 0,
          users_with_shared_conversations:
            (
              (conversationsResponse.aggregations?.shared as any)
                ?.unique_users as AggregationsCardinalityAggregate
            )?.value ?? 0,
        },
      };
    },
  });

  usageCollection.registerCollector(usageCollector);
}
