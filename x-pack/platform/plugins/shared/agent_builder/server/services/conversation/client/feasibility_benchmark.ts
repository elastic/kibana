/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type {
  StorageClientBulkOperation,
  StorageClientBulkResponse,
  StorageClientSearchRequest,
} from '@kbn/storage-adapter';
import { ToolResultType } from '@kbn/agent-builder-common';
import { ConversationAccessControlMode } from '@kbn/agent-builder-common/chat/access_control';
import { ConversationRoundStatus, ConversationRoundStepType } from '@kbn/agent-builder-common/chat';
import type { ConversationProperties } from './storage';

export interface ConversationFeasibilityCorpus {
  conversationCount: number;
  roundsPerConversation: number;
  toolCallsPerConversation: number;
  p95ThresholdMs: number;
}

export const CONVERSATION_FEASIBILITY_CORPUS: ConversationFeasibilityCorpus = {
  conversationCount: 1000,
  roundsPerConversation: 1000,
  toolCallsPerConversation: 500,
  p95ThresholdMs: 1000,
} as const;

export const CONVERSATION_FEASIBILITY_LOCAL_TARGETS = {
  kibanaUrl: 'http://127.0.0.1:5601',
  elasticsearchUrls: ['http://127.0.0.1:9200', 'http://127.0.0.1:9201'],
  elasticsearchUsername: 'elastic',
  elasticsearchPassword: 'changeme',
} as const;

export interface ConversationFeasibilityBenchmarkClient {
  bulk(request: {
    operations: Array<StorageClientBulkOperation<ConversationProperties>>;
    refresh: 'wait_for';
    throwOnFail: true;
  }): Promise<StorageClientBulkResponse>;
  search(request: StorageClientSearchRequest): Promise<{ took?: number }>;
}

export interface ConversationFeasibilityBenchmarkResult {
  name: string;
  samplesMs: number[];
  esTookMs: number[];
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
  p95ThresholdExceededPercentage: number;
  passed: boolean;
}

export interface ConversationFeasibilitySearchRequest {
  name: string;
  request: StorageClientSearchRequest;
}

export type ConversationFeasibilityBenchmarkLogger = (message: string) => void;

export interface ConversationFeasibilityAssignee {
  id: string;
  name: string;
}

export const CONVERSATION_FEASIBILITY_ASSIGNEE_CORPUS: ConversationFeasibilityAssignee[] =
  Array.from({ length: 50 }, (_, index) => ({
    id: `assignee-${index}`,
    name: `Benchmark Assignee ${index}`,
  }));

const accessFilter: QueryDslQueryContainer = {
  bool: {
    should: [
      { term: { 'access_control.access_mode': ConversationAccessControlMode.Public } },
      {
        bool: {
          should: [{ term: { user_name: 'benchmark-user' } }, { term: { user_id: 'user-1' } }],
          minimum_should_match: 1,
        },
      },
    ],
    minimum_should_match: 1,
  },
};

const baseSearchFilters: QueryDslQueryContainer[] = [
  { term: { space: 'default' } },
  { terms: { agent_id: ['agent-0', 'agent-1', 'agent-2', 'agent-3', 'agent-4'] } },
  accessFilter,
];

const buildTemplateAssignees = (index: number): ConversationFeasibilityAssignee[] =>
  Array.from({ length: 10 }, (_, assigneeIndex) => {
    const corpusIndex =
      (index * 13 + assigneeIndex * 7) % CONVERSATION_FEASIBILITY_ASSIGNEE_CORPUS.length;

    return CONVERSATION_FEASIBILITY_ASSIGNEE_CORPUS[corpusIndex];
  });

const pickRandomAssignees = (
  count: number,
  assignees: ConversationFeasibilityAssignee[] = CONVERSATION_FEASIBILITY_ASSIGNEE_CORPUS
): ConversationFeasibilityAssignee[] => {
  const picked = new Set<number>();

  while (picked.size < Math.min(count, assignees.length)) {
    picked.add(Math.floor(Math.random() * assignees.length));
  }

  return [...picked].map((index) => assignees[index]);
};

export const buildFeasibilityConversationDocument = (
  index: number,
  corpus: ConversationFeasibilityCorpus = CONVERSATION_FEASIBILITY_CORPUS
): ConversationProperties => {
  const hasToolCall = (roundIndex: number) => roundIndex < corpus.toolCallsPerConversation;

  return {
    user_id: index % 2 === 0 ? 'user-1' : `user-${index}`,
    user_name: index % 2 === 0 ? 'benchmark-user' : `benchmark-user-${index}`,
    agent_id: `agent-${index % 5}`,
    space: 'default',
    title: `Benchmark conversation ${index}`,
    created_at: '2026-07-09T00:00:00.000Z',
    updated_at: '2026-07-09T00:00:00.000Z',
    template: {
      id: `template-${index % 5}`,
      version: (index % 3) + 1,
    },
    extended_fields: {
      priority_as_keyword: ['low', 'medium', 'high'][index % 3],
      risk_score_as_long: String(index % 100),
      region_as_keyword: ['emea', 'amer', 'apac'][index % 3],
      assignee_as_user: JSON.stringify({ id: `user-${index % 10}`, name: `User ${index % 10}` }),
      tags_as_array: index % 2 === 0 ? 'prod,security' : 'dev,observability',
      summary_as_text: `conversation ${index} investigation summary with repeated tool output`,
      assignees_as_array: JSON.stringify(buildTemplateAssignees(index)),
    },
    conversation_rounds: Array.from({ length: corpus.roundsPerConversation }, (_, roundIndex) => ({
      id: `round-${index}-${roundIndex}`,
      status: ConversationRoundStatus.completed,
      input: {
        message: `Message ${roundIndex} for benchmark conversation ${index}`,
      },
      response: {
        message: `Response ${roundIndex} for benchmark conversation ${index}`,
      },
      started_at: '2026-07-09T00:00:00.000Z',
      time_to_first_token: 10,
      time_to_last_token: 20,
      model_usage: {
        connector_id: 'benchmark-connector',
        llm_calls: 1,
        input_tokens: 128,
        output_tokens: 256,
      },
      steps: hasToolCall(roundIndex)
        ? [
            {
              type: ConversationRoundStepType.toolCall,
              tool_call_id: `tool-call-${index}-${roundIndex}`,
              tool_id: 'benchmark.tool',
              params: {
                query: `benchmark query ${index}-${roundIndex}`,
              },
              results: JSON.stringify([
                {
                  tool_result_id: `tool-result-${index}-${roundIndex}`,
                  type: ToolResultType.other,
                  data: {
                    content: `Tool result payload ${index}-${roundIndex}`.repeat(20),
                  },
                },
              ]),
            },
          ]
        : [],
    })),
    attachments: [],
    read: false,
    access_control: {
      access_mode:
        index % 4 === 0
          ? ConversationAccessControlMode.Public
          : ConversationAccessControlMode.Private,
    },
  };
};

export const buildConversationFeasibilitySeedOperations = ({
  corpus = CONVERSATION_FEASIBILITY_CORPUS,
  idPrefix = 'benchmark-conversation',
  start = 0,
  count = corpus.conversationCount,
}: {
  corpus?: ConversationFeasibilityCorpus;
  idPrefix?: string;
  start?: number;
  count?: number;
} = {}): Array<StorageClientBulkOperation<ConversationProperties>> =>
  Array.from({ length: count }, (_, offset) => {
    const index = start + offset;

    return {
      index: {
        _id: `${idPrefix}-${index}`,
        document: buildFeasibilityConversationDocument(index, corpus),
      },
    };
  });

export const buildConversationFeasibilitySearchRequests =
  (): ConversationFeasibilitySearchRequest[] => {
    const randomAssigneeNames = pickRandomAssignees(3).map(({ name }) => name);

    return [
      {
        name: 'exact_template_and_extended_field',
        request: {
          track_total_hits: true,
          size: 20,
          query: {
            bool: {
              filter: [
                ...baseSearchFilters,
                { term: { 'template.id': 'template-1' } },
                { term: { 'template.version': 3 } },
                { term: { 'extended_fields.priority_as_keyword': 'high' } },
              ],
            },
          },
        },
      },
      {
        name: 'exact_extended_field_exists',
        request: {
          track_total_hits: true,
          size: 20,
          query: {
            bool: {
              filter: [
                ...baseSearchFilters,
                { exists: { field: 'extended_fields.risk_score_as_long' } },
              ],
            },
          },
        },
      },
      {
        name: 'runtime_numeric_range',
        request: {
          track_total_hits: true,
          size: 20,
          runtime_mappings: {
            risk_score_runtime: {
              type: 'long',
              script: {
                source: `
                if (params._source == null) return;
                def ef = params._source.get('extended_fields');
                if (ef == null || !(ef instanceof Map)) return;
                def raw = ef.get('risk_score_as_long');
                if (raw == null) return;
                emit(Long.parseLong(raw));
              `,
              },
            },
          },
          query: {
            bool: {
              filter: [...baseSearchFilters, { range: { risk_score_runtime: { gte: 50 } } }],
            },
          },
        },
      },
      {
        name: 'runtime_all_values_text',
        request: {
          track_total_hits: true,
          size: 20,
          runtime_mappings: {
            ef_all_values: {
              type: 'keyword',
              script: {
                source: `
                if (params._source == null) return;
                def ef = params._source.get('extended_fields');
                if (ef == null || !(ef instanceof Map)) return;
                for (entry in ef.entrySet()) {
                  if (entry.getValue() != null) emit(entry.getValue().toString());
                }
              `,
              },
            },
          },
          query: {
            bool: {
              filter: [...baseSearchFilters, { wildcard: { ef_all_values: '*investigation*' } }],
            },
          },
        },
      },
      {
        name: 'indexed_all_values_text',
        request: {
          track_total_hits: true,
          size: 20,
          query: {
            bool: {
              filter: [
                ...baseSearchFilters,
                {
                  query_string: {
                    default_field: 'extended_fields',
                    query: '*investigation*',
                  },
                },
                {
                  bool: {
                    should: [
                      { terms: { extended_fields: ['50', '60', '70'] } },
                      { range: { 'extended_fields.risk_score_as_long': { gte: '40', lte: '90' } } },
                    ],
                    minimum_should_match: 1,
                  },
                },
              ],
            },
          },
        },
      },
      {
        name: 'runtime_user_picker_name_wildcard',
        request: {
          track_total_hits: true,
          size: 20,
          runtime_mappings: {
            assignee_name_runtime: {
              type: 'keyword',
              script: {
                source: `
                if (params._source == null) return;
                def ef = params._source.get('extended_fields');
                if (ef == null || !(ef instanceof Map)) return;
                def raw = ef.get('assignee_as_user');
                if (raw == null) return;
                def value = raw.toString();
                int marker = value.indexOf('"name":"');
                if (marker < 0) return;
                int start = marker + 8;
                int end = value.indexOf('"', start);
                if (end > start) emit(value.substring(start, end));
              `,
              },
            },
          },
          query: {
            bool: {
              filter: [
                ...baseSearchFilters,
                { wildcard: { assignee_name_runtime: 'User 1*' } },
                { terms: { 'template.id': ['template-1', 'template-2', 'template-3'] } },
              ],
            },
          },
        },
      },
      {
        name: 'runtime_assignees_array_name_lookup',
        request: {
          track_total_hits: true,
          size: 20,
          runtime_mappings: {
            template_assignee_name_runtime: {
              type: 'keyword',
              script: {
                source: `
                if (params._source == null) return;
                def ef = params._source.get('extended_fields');
                if (ef == null || !(ef instanceof Map)) return;
                def raw = ef.get('assignees_as_array');
                if (raw == null) return;
                def value = raw.toString();
                def matcher = /"name":"([^"]*)"/.matcher(value);
                while (matcher.find()) {
                  emit(matcher.group(1));
                }
              `,
              },
            },
          },
          query: {
            bool: {
              filter: [
                ...baseSearchFilters,
                { terms: { template_assignee_name_runtime: randomAssigneeNames } },
              ],
            },
          },
        },
      },
      {
        name: 'runtime_tags_membership_with_complex_bool',
        request: {
          track_total_hits: true,
          size: 20,
          runtime_mappings: {
            tags_runtime: {
              type: 'keyword',
              script: {
                source: `
                if (params._source == null) return;
                def ef = params._source.get('extended_fields');
                if (ef == null || !(ef instanceof Map)) return;
                def raw = ef.get('tags_as_array');
                if (raw == null) return;
                for (tag in raw.toString().splitOnToken(',')) {
                  emit(tag);
                }
              `,
              },
            },
            risk_score_runtime: {
              type: 'long',
              script: {
                source: `
                if (params._source == null) return;
                def ef = params._source.get('extended_fields');
                if (ef == null || !(ef instanceof Map)) return;
                def raw = ef.get('risk_score_as_long');
                if (raw == null) return;
                emit(Long.parseLong(raw));
              `,
              },
            },
          },
          query: {
            bool: {
              filter: [
                ...baseSearchFilters,
                { term: { tags_runtime: 'security' } },
                { range: { risk_score_runtime: { gte: 40, lte: 90 } } },
              ],
              should: [
                { term: { 'extended_fields.region_as_keyword': 'emea' } },
                { term: { 'extended_fields.priority_as_keyword': 'high' } },
              ],
              minimum_should_match: 1,
              must_not: [{ term: { 'template.id': 'template-4' } }],
            },
          },
        },
      },
      {
        name: 'runtime_multi_field_source_scan',
        request: {
          track_total_hits: true,
          size: 20,
          runtime_mappings: {
            ef_complex_match_runtime: {
              type: 'keyword',
              script: {
                source: `
                if (params._source == null) return;
                def ef = params._source.get('extended_fields');
                if (ef == null || !(ef instanceof Map)) return;
                def summary = ef.get('summary_as_text');
                def priority = ef.get('priority_as_keyword');
                def region = ef.get('region_as_keyword');
                def assignee = ef.get('assignee_as_user');
                if (summary != null && summary.toString().contains('investigation')) emit('summary');
                if (priority != null && priority.toString() == 'high') emit('priority');
                if (region != null && region.toString() == 'emea') emit('region');
                if (assignee != null && assignee.toString().contains('User 1')) emit('assignee');
              `,
              },
            },
          },
          query: {
            bool: {
              filter: [
                ...baseSearchFilters,
                {
                  bool: {
                    should: [
                      { term: { ef_complex_match_runtime: 'summary' } },
                      { term: { ef_complex_match_runtime: 'priority' } },
                      { term: { ef_complex_match_runtime: 'assignee' } },
                    ],
                    minimum_should_match: 2,
                  },
                },
              ],
            },
          },
        },
      },
      {
        name: 'indexed_multi_field_flattened_scan',
        request: {
          track_total_hits: true,
          size: 20,
          query: {
            bool: {
              filter: [
                ...baseSearchFilters,
                {
                  bool: {
                    should: [
                      {
                        query_string: {
                          default_field: 'extended_fields.summary_as_text',
                          query: '*investigation*',
                        },
                      },
                      { term: { 'extended_fields.priority_as_keyword': 'high' } },
                      { term: { 'extended_fields.region_as_keyword': 'emea' } },
                      {
                        query_string: {
                          default_field: 'extended_fields.assignee_as_user',
                          query: '*User\\ 1*',
                        },
                      },
                    ],
                    minimum_should_match: 2,
                  },
                },
              ],
            },
          },
        },
      },
    ];
  };

export const summarizeConversationFeasibilityTimings = (
  name: string,
  samplesMs: number[],
  esTookMs: number[] = [],
  corpus: ConversationFeasibilityCorpus = CONVERSATION_FEASIBILITY_CORPUS
): ConversationFeasibilityBenchmarkResult => {
  const sorted = [...samplesMs].sort((a, b) => a - b);
  const percentile = (percent: number) => {
    if (sorted.length === 0) {
      return 0;
    }
    return sorted[Math.min(sorted.length - 1, Math.ceil((percent / 100) * sorted.length) - 1)];
  };

  const p95Ms = percentile(95);
  const p95ThresholdExceededPercentage = Math.max(
    ((p95Ms - corpus.p95ThresholdMs) / corpus.p95ThresholdMs) * 100,
    0
  );

  return {
    name,
    samplesMs,
    esTookMs,
    p50Ms: percentile(50),
    p95Ms,
    maxMs: sorted[sorted.length - 1] ?? 0,
    p95ThresholdExceededPercentage,
    passed: p95ThresholdExceededPercentage <= 10,
  };
};

export const runConversationFeasibilityBenchmark = async ({
  client,
  iterations = 5,
  seed = true,
  corpus = CONVERSATION_FEASIBILITY_CORPUS,
  idPrefix,
  seedBatchSize = 50,
  logger,
}: {
  client: ConversationFeasibilityBenchmarkClient;
  iterations?: number;
  seed?: boolean;
  corpus?: ConversationFeasibilityCorpus;
  idPrefix?: string;
  seedBatchSize?: number;
  logger?: ConversationFeasibilityBenchmarkLogger;
}): Promise<ConversationFeasibilityBenchmarkResult[]> => {
  if (seed) {
    const totalBatches = Math.ceil(corpus.conversationCount / seedBatchSize);
    let nextProgressPercentage = 10;

    for (let start = 0; start < corpus.conversationCount; start += seedBatchSize) {
      const batchNumber = Math.floor(start / seedBatchSize) + 1;
      await client.bulk({
        operations: buildConversationFeasibilitySeedOperations({
          corpus,
          idPrefix,
          start,
          count: Math.min(seedBatchSize, corpus.conversationCount - start),
        }),
        refresh: 'wait_for',
        throwOnFail: true,
      });

      const completedPercentage = Math.floor((batchNumber / totalBatches) * 100);
      if (completedPercentage >= nextProgressPercentage || batchNumber === totalBatches) {
        logger?.(
          `Seeding ${Math.min(
            completedPercentage,
            100
          )}% complete (${batchNumber}/${totalBatches} batches)`
        );
        nextProgressPercentage += 10;
      }
    }
  }

  const results: ConversationFeasibilityBenchmarkResult[] = [];

  for (const { name, request } of buildConversationFeasibilitySearchRequests()) {
    logger?.(`Starting search benchmark "${name}"`);

    const samplesMs: number[] = [];
    const esTookMs: number[] = [];

    for (let iteration = 0; iteration < iterations; iteration++) {
      const startedAt = Date.now();
      const response = await client.search(request);
      samplesMs.push(Date.now() - startedAt);

      if (response.took !== undefined) {
        esTookMs.push(response.took);
      }
    }

    const result = summarizeConversationFeasibilityTimings(name, samplesMs, esTookMs, corpus);
    const exceededThreshold =
      result.p95ThresholdExceededPercentage > 0
        ? `, +${result.p95ThresholdExceededPercentage.toFixed(1)}% over limit`
        : '';

    logger?.(
      `Finished search benchmark "${name}": p95=${result.p95Ms}ms${exceededThreshold}, ${
        result.passed ? 'PASS' : 'FAIL'
      }`
    );
    results.push(result);
  }

  return results;
};
