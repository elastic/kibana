/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationRoundStepType } from '@kbn/agent-builder-common';
import {
  buildConversationFeasibilitySearchRequests,
  buildConversationFeasibilitySeedOperations,
  buildFeasibilityConversationDocument,
  CONVERSATION_FEASIBILITY_CORPUS,
  CONVERSATION_FEASIBILITY_LOCAL_TARGETS,
  runConversationFeasibilityBenchmark,
  summarizeConversationFeasibilityTimings,
} from './feasibility_benchmark';

describe('conversation templating feasibility benchmark', () => {
  const tinyCorpus = {
    conversationCount: 2,
    roundsPerConversation: 3,
    toolCallsPerConversation: 2,
    p95ThresholdMs: 500,
  };

  it('defines the stress corpus as the benchmark baseline and latency gate', () => {
    expect(CONVERSATION_FEASIBILITY_CORPUS).toEqual({
      conversationCount: 1000,
      roundsPerConversation: 1000,
      toolCallsPerConversation: 500,
      p95ThresholdMs: 1000,
    });
  });

  it('documents the local benchmark URLs and standard dev credentials', () => {
    expect(CONVERSATION_FEASIBILITY_LOCAL_TARGETS).toEqual({
      kibanaUrl: 'http://127.0.0.1:5601',
      elasticsearchUrls: ['http://127.0.0.1:9200', 'http://127.0.0.1:9201'],
      elasticsearchUsername: 'elastic',
      elasticsearchPassword: 'changeme',
    });
  });

  it('builds one baseline stress conversation document', () => {
    const document = buildFeasibilityConversationDocument(1);
    const toolCalls = document.conversation_rounds.flatMap((round) =>
      round.steps.filter((step) => step.type === ConversationRoundStepType.toolCall)
    );

    expect(document.template).toEqual({ id: 'template-1', version: 2 });
    expect(document.extended_fields).toEqual(
      expect.objectContaining({
        priority_as_keyword: 'medium',
        risk_score_as_long: '1',
        related_objects_as_array: expect.any(String),
        summary_as_text: expect.stringContaining('investigation summary'),
      })
    );
    const relatedObjects = JSON.parse(document.extended_fields?.related_objects_as_array ?? '[]');

    expect(relatedObjects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.stringMatching(/^template-object-\d+$/),
          name: expect.stringMatching(/^benchmark-object-\d+$/),
        }),
      ])
    );
    expect(relatedObjects).toHaveLength(10);
    expect(document.conversation_rounds).toHaveLength(1000);
    expect(toolCalls).toHaveLength(500);
  });

  it('builds a seed operation window for the stress corpus', () => {
    const operations = buildConversationFeasibilitySeedOperations({ start: 10, count: 2 });

    expect(operations).toHaveLength(2);
    expect(operations[0]).toEqual(
      expect.objectContaining({
        index: expect.objectContaining({
          _id: 'benchmark-conversation-10',
        }),
      })
    );
  });

  it('builds seed operations for a custom corpus with a custom prefix', () => {
    const operations = buildConversationFeasibilitySeedOperations({
      corpus: tinyCorpus,
      idPrefix: 'benchmark-stress-conversation',
    });

    expect(operations).toHaveLength(2);
    expect(operations[0]).toEqual(
      expect.objectContaining({
        index: expect.objectContaining({
          _id: 'benchmark-stress-conversation-0',
        }),
      })
    );
  });

  it('builds exact and runtime search requests', () => {
    const requests = buildConversationFeasibilitySearchRequests();

    expect(requests.map(({ name }) => name)).toEqual([
      'exact_template_and_extended_field',
      'exact_extended_field_exists',
      'runtime_numeric_range',
      'runtime_all_values_text',
      'indexed_all_values_text',
      'runtime_user_picker_name_wildcard',
      'runtime_template_object_array_name_lookup',
      'runtime_tags_membership_with_complex_bool',
      'runtime_multi_field_source_scan',
      'indexed_multi_field_flattened_scan',
    ]);
    expect(requests[0].request.query).toEqual(
      expect.objectContaining({
        bool: expect.objectContaining({
          filter: expect.arrayContaining([
            { term: { 'template.id': 'template-1' } },
            { term: { 'template.version': 3 } },
            { term: { 'extended_fields.priority_as_keyword': 'high' } },
          ]),
        }),
      })
    );
    expect(requests[2].request.runtime_mappings).toEqual(
      expect.objectContaining({
        risk_score_runtime: expect.objectContaining({ type: 'long' }),
      })
    );
    expect(requests[4].request.runtime_mappings).toEqual(undefined);
    expect(requests[4].request.query).toEqual(
      expect.objectContaining({
        bool: expect.objectContaining({
          filter: expect.arrayContaining([
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
          ]),
        }),
      })
    );
    expect(requests[5].request.runtime_mappings).toEqual(
      expect.objectContaining({
        assignee_name_runtime: expect.objectContaining({ type: 'keyword' }),
      })
    );
    expect(requests[6].request.runtime_mappings).toEqual(
      expect.objectContaining({
        related_object_name_runtime: expect.objectContaining({ type: 'keyword' }),
      })
    );
    expect(requests[6].request.query).toEqual(
      expect.objectContaining({
        bool: expect.objectContaining({
          filter: expect.arrayContaining([
            { term: { related_object_name_runtime: 'benchmark-object-17' } },
          ]),
        }),
      })
    );
    expect(requests[7].request.query).toEqual(
      expect.objectContaining({
        bool: expect.objectContaining({
          minimum_should_match: 1,
          must_not: expect.arrayContaining([{ term: { 'template.id': 'template-4' } }]),
        }),
      })
    );
    expect(requests[9].request.runtime_mappings).toEqual(undefined);
    expect(requests[9].request.query).toEqual(
      expect.objectContaining({
        bool: expect.objectContaining({
          filter: expect.arrayContaining([
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
          ]),
        }),
      })
    );
  });

  it('summarizes p95 against the 1000ms gate plus 10% tolerance', () => {
    expect(summarizeConversationFeasibilityTimings('fast', [100, 200, 900])).toEqual(
      expect.objectContaining({
        p95ThresholdExceededPercentage: 0,
        passed: true,
      })
    );
    expect(summarizeConversationFeasibilityTimings('tolerated', [100, 200, 1050])).toEqual(
      expect.objectContaining({
        p95ThresholdExceededPercentage: 5,
        passed: true,
      })
    );
    expect(summarizeConversationFeasibilityTimings('slow', [100, 200, 1200])).toEqual(
      expect.objectContaining({
        p95ThresholdExceededPercentage: 20,
        passed: false,
      })
    );
  });

  it('can run the benchmark against a storage-like client', async () => {
    const client = {
      bulk: jest.fn().mockResolvedValue({ errors: false, items: [], took: 1, ingest_took: 1 }),
      search: jest.fn().mockResolvedValue({ took: 1 }),
    };
    const logger = jest.fn();

    const results = await runConversationFeasibilityBenchmark({
      client,
      iterations: 2,
      corpus: tinyCorpus,
      idPrefix: 'benchmark-stress-conversation',
      seedBatchSize: 1,
      logger,
    });

    expect(client.bulk).toHaveBeenCalledWith(
      expect.objectContaining({
        operations: expect.arrayContaining([
          expect.objectContaining({
            index: expect.objectContaining({ _id: 'benchmark-stress-conversation-0' }),
          }),
        ]),
        refresh: 'wait_for',
        throwOnFail: true,
      })
    );
    expect(client.bulk).toHaveBeenCalledTimes(2);
    expect(client.search).toHaveBeenCalledTimes(20);
    expect(results).toHaveLength(10);
    expect(results[0].samplesMs).toHaveLength(2);
    expect(results[0].esTookMs).toEqual([1, 1]);
    expect(logger).toHaveBeenCalledWith('Seeding 50% complete (1/2 batches)');
    expect(logger).toHaveBeenCalledWith('Seeding 100% complete (2/2 batches)');
    expect(logger).toHaveBeenCalledWith(
      'Starting search benchmark "exact_template_and_extended_field"'
    );
    expect(logger).toHaveBeenCalledWith(
      expect.stringMatching(
        /^Finished search benchmark "exact_template_and_extended_field": p95=\d+ms, PASS$/
      )
    );
  });
});
