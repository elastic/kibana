/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { BoundInferenceClient, ToolCallback } from '@kbn/inference-common';

jest.mock('@kbn/inference-prompt-utils', () => ({
  executeAsReasoningAgent: jest.fn(),
}));

import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import { identifyFeatures } from './identify_features';

const executeAsReasoningAgentMock = executeAsReasoningAgent as jest.MockedFunction<
  typeof executeAsReasoningAgent
>;
const inferenceClient = {} as BoundInferenceClient;
const signal = new AbortController().signal;
const logger = {
  warn: jest.fn(),
} as unknown as Logger;

const callTool = (
  callback: ToolCallback,
  name: string,
  args: Record<string, unknown>
): ReturnType<ToolCallback> =>
  callback({
    toolCallId: `call-${name}`,
    function: {
      name,
      arguments: args,
    },
  });

const createReasoningResponse = (arguments_: Record<string, unknown>) =>
  ({
    content: '',
    toolCalls: [
      {
        toolCallId: 'call-finalize_features',
        function: {
          name: 'finalize_features',
          arguments: arguments_,
        },
      },
    ],
    tokens: { prompt: 10, completion: 5, total: 15 },
  } as unknown as Awaited<ReturnType<typeof executeAsReasoningAgent>>);

const emptyReasoningResponse = createReasoningResponse({
  features: [],
  ignored_features: [],
});
const responseWithoutFinalTool = {
  content: '',
  toolCalls: [],
  tokens: { prompt: 10, completion: 5, total: 15 },
} as unknown as Awaited<ReturnType<typeof executeAsReasoningAgent>>;

describe('identifyFeatures', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the reasoning-agent tools and validates finalized output', async () => {
    const searchSimilarFeatures = jest.fn().mockResolvedValue([
      {
        id: 'okta',
        title: 'Okta',
        description: 'Known Okta feature',
        confidence: 90,
      },
    ]);
    let capturedOptions: Parameters<typeof executeAsReasoningAgent>[0] | undefined;
    let searchResponse: Awaited<ReturnType<ToolCallback>> | undefined;

    executeAsReasoningAgentMock.mockImplementation(async (options) => {
      capturedOptions = options as Parameters<typeof executeAsReasoningAgent>[0];
      searchResponse = await callTool(
        capturedOptions.toolCallbacks.search_similar_features,
        'search_similar_features',
        {
          candidate_id: 'okta-sdk',
          title: 'Okta SDK',
          description: 'Okta client technology',
          type: 'technology',
        }
      );
      return createReasoningResponse({
        features: [
          {
            id: 'okta',
            type: 'technology',
            subtype: 'identity_provider',
            title: 'Okta',
            description: 'Okta identity provider',
            properties: { name: 'okta' },
            confidence: 90,
            evidence: ['service.name=okta'],
            evidence_doc_ids: ['doc-1'],
            tags: ['identity'],
            filter: { field: 'service.name' },
          },
          {
            id: 'empty-properties',
            type: 'technology',
            subtype: 'library',
            title: 'Invalid',
            description: 'Invalid feature',
            properties: {},
            confidence: 50,
            evidence: [],
            tags: [],
          },
          {
            id: 'okta',
            type: 'technology',
            subtype: 'identity_provider',
            title: 'Duplicate Okta',
            description: 'Duplicate output',
            properties: { name: 'okta' },
            confidence: 80,
            evidence: [],
            tags: [],
          },
        ],
        ignored_features: [
          {
            feature_id: 'excluded',
            feature_title: 'Excluded',
            excluded_feature_id: 'known-excluded',
            reason: 'Same feature',
          },
          { feature_id: 42 },
        ],
      });
    });

    const result = await identifyFeatures({
      streamName: 'logs.test',
      sampleDocuments: [],
      inferenceClient,
      systemPrompt: 'system prompt',
      logger,
      signal,
      previouslyIdentifiedFeatures: [
        {
          id: 'existing',
          type: 'technology',
          properties: { name: 'existing' },
        },
      ],
      knownFeatureIds: 'technology: existing, okta',
      searchSimilarFeatures,
    });

    expect(capturedOptions).toEqual(
      expect.objectContaining({
        maxSteps: 4,
        finalToolChoice: {
          type: 'function',
          function: 'finalize_features',
        },
        input: {
          sample_documents: '[]',
          previously_identified_features: JSON.stringify([
            {
              id: 'existing',
              type: 'technology',
              properties: { name: 'existing' },
            },
          ]),
          known_feature_ids: 'technology: existing, okta',
          excluded_features: '',
        },
      })
    );
    expect(searchSimilarFeatures).toHaveBeenCalledWith({
      candidate_id: 'okta-sdk',
      title: 'Okta SDK',
      description: 'Okta client technology',
      type: 'technology',
    });
    expect(searchResponse).toEqual({
      response: {
        features: [
          {
            id: 'okta',
            title: 'Okta',
            description: 'Known Okta feature',
            confidence: 90,
          },
        ],
        count: 1,
      },
    });
    expect(result.features).toEqual([
      expect.objectContaining({
        id: 'okta',
        stream_name: 'logs.test',
        filter: undefined,
      }),
    ]);
    expect(result.ignoredFeatures).toEqual([
      {
        feature_id: 'excluded',
        feature_title: 'Excluded',
        excluded_feature_id: 'known-excluded',
        reason: 'Same feature',
      },
    ]);
    expect(result.tokensUsed).toEqual({ prompt: 10, completion: 5, total: 15, cached: 0 });
  });

  it('returns a tool error instead of failing when semantic search rejects', async () => {
    const searchSimilarFeatures = jest.fn().mockRejectedValue(new Error('semantic unavailable'));
    let searchResponse: Awaited<ReturnType<ToolCallback>> | undefined;

    executeAsReasoningAgentMock.mockImplementation(async (options) => {
      const callbacks = (options as Parameters<typeof executeAsReasoningAgent>[0]).toolCallbacks;
      searchResponse = await callTool(
        callbacks.search_similar_features,
        'search_similar_features',
        {
          candidate_id: 'candidate',
          title: 'Candidate',
          description: 'Candidate description',
          type: 'technology',
        }
      );
      return emptyReasoningResponse;
    });

    const result = await identifyFeatures({
      streamName: 'logs.test',
      sampleDocuments: [],
      inferenceClient,
      systemPrompt: 'system prompt',
      logger,
      signal,
      searchSimilarFeatures,
    });

    expect(searchResponse).toEqual({
      response: {
        features: [],
        count: 0,
        error: 'semantic unavailable',
      },
    });
    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to search similar features: semantic unavailable'
    );
    expect(result.features).toEqual([]);
  });

  it('keeps semantic search optional for existing consumers', async () => {
    let searchResponse: Awaited<ReturnType<ToolCallback>> | undefined;

    executeAsReasoningAgentMock.mockImplementation(async (options) => {
      const callbacks = (options as Parameters<typeof executeAsReasoningAgent>[0]).toolCallbacks;
      searchResponse = await callTool(
        callbacks.search_similar_features,
        'search_similar_features',
        {
          candidate_id: 'candidate',
          title: 'Candidate',
          description: 'Candidate description',
          type: 'technology',
        }
      );
      return emptyReasoningResponse;
    });

    await identifyFeatures({
      streamName: 'logs.test',
      sampleDocuments: [],
      inferenceClient,
      systemPrompt: 'system prompt',
      logger,
      signal,
    });

    expect(searchResponse).toEqual({
      response: {
        features: [],
        count: 0,
        error: 'Semantic feature search is unavailable.',
      },
    });
  });

  it('fails the iteration when the reasoning agent does not finalize', async () => {
    executeAsReasoningAgentMock.mockResolvedValue(responseWithoutFinalTool);

    await expect(
      identifyFeatures({
        streamName: 'logs.test',
        sampleDocuments: [],
        inferenceClient,
        systemPrompt: 'system prompt',
        logger,
        signal,
      })
    ).rejects.toThrow('Feature identification did not call finalize_features');
  });

  it('fails the iteration when final tool output is malformed', async () => {
    executeAsReasoningAgentMock.mockResolvedValue(
      createReasoningResponse({ ignored_features: [] })
    );

    await expect(
      identifyFeatures({
        streamName: 'logs.test',
        sampleDocuments: [],
        inferenceClient,
        systemPrompt: 'system prompt',
        logger,
        signal,
      })
    ).rejects.toThrow('Feature identification returned invalid finalize_features output');
  });
});
