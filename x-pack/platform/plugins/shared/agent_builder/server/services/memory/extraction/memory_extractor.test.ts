/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { MemoryExtractor, buildExtractionInputFromRound } from './memory_extractor';
import type { ExtractionResult } from './memory_extractor';
import type { ConversationRound } from '@kbn/agent-builder-common';
import { ConversationRoundStatus, ConversationRoundStepType } from '@kbn/agent-builder-common';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeLogger = () => loggerMock.create();

import type { KibanaRequest } from '@kbn/core-http-server';

const makeRequest = () => ({} as unknown as KibanaRequest);

const makeInference = (responseText: string): InferenceServerStart => {
  const mockChatComplete = jest.fn().mockResolvedValue({
    content: responseText,
  });
  const mockGetClient = jest.fn().mockReturnValue({
    chatComplete: mockChatComplete,
  });

  return {
    getClient: mockGetClient,
    getConnectorList: jest.fn(),
    getDefaultConnector: jest.fn(),
    getChatModel: jest.fn(),
  } as unknown as InferenceServerStart;
};

const validExtractionResponse: ExtractionResult = {
  semantic: [
    {
      summary: 'User prefers TypeScript over JavaScript',
      full: 'User has consistently indicated a preference for TypeScript in all new projects.',
      subtype: 'user_preference',
      confidence: 0.9,
    },
  ],
  episodic: [
    {
      summary: 'User proposed embedding-based deduplication with 0.92 threshold',
      full: 'During this round, user suggested using cosine similarity at 0.92 for near-duplicate detection.',
      subtype: 'decision',
      confidence: 0.85,
    },
  ],
  procedural: [
    {
      summary: 'Always run type_check before committing TypeScript changes',
      full: 'User prefers running `node scripts/type_check` before any commit to catch type errors early.',
      subtype: 'workflow_step',
      confidence: 0.8,
    },
  ],
};

// ---------------------------------------------------------------------------
// Tests: MemoryExtractor
// ---------------------------------------------------------------------------

describe('MemoryExtractor', () => {
  describe('extract', () => {
    it('parses a valid JSON extraction response', async () => {
      const inference = makeInference(JSON.stringify(validExtractionResponse));
      const extractor = new MemoryExtractor({
        inference,
        connectorId: 'test-connector',
        request: makeRequest(),
        logger: makeLogger(),
      });

      const result = await extractor.extract({
        userMessage: 'I prefer TypeScript for all projects',
        assistantResponse: 'Got it, I will use TypeScript.',
      });

      expect(result.semantic).toHaveLength(1);
      expect(result.semantic[0].summary).toBe('User prefers TypeScript over JavaScript');
      expect(result.semantic[0].confidence).toBe(0.9);
      expect(result.episodic).toHaveLength(1);
      expect(result.procedural).toHaveLength(1);
    });

    it('parses JSON wrapped in markdown code fences', async () => {
      const fenced = `\`\`\`json\n${JSON.stringify(validExtractionResponse)}\n\`\`\``;
      const inference = makeInference(fenced);
      const extractor = new MemoryExtractor({
        inference,
        connectorId: 'test-connector',
        request: makeRequest(),
        logger: makeLogger(),
      });

      const result = await extractor.extract({
        userMessage: 'test',
        assistantResponse: 'test response',
      });

      expect(result.semantic).toHaveLength(1);
    });

    it('filters candidates below minimum confidence threshold (0.4)', async () => {
      const lowConfidenceResponse = {
        semantic: [
          { summary: 'Low confidence fact', full: 'Not reliable', confidence: 0.3 },
          { summary: 'High confidence fact', full: 'Very reliable', confidence: 0.7 },
        ],
        episodic: [],
        procedural: [],
      };

      const inference = makeInference(JSON.stringify(lowConfidenceResponse));
      const extractor = new MemoryExtractor({
        inference,
        connectorId: 'test-connector',
        request: makeRequest(),
        logger: makeLogger(),
      });

      const result = await extractor.extract({
        userMessage: 'test',
        assistantResponse: 'test',
      });

      expect(result.semantic).toHaveLength(1);
      expect(result.semantic[0].summary).toBe('High confidence fact');
    });

    it('caps semantic memories at 5 per round', async () => {
      const manySemantics = {
        semantic: Array.from({ length: 10 }, (_, i) => ({
          summary: `Semantic fact ${i}`,
          full: `Full content ${i}`,
          confidence: 0.8,
        })),
        episodic: [],
        procedural: [],
      };

      const inference = makeInference(JSON.stringify(manySemantics));
      const extractor = new MemoryExtractor({
        inference,
        connectorId: 'test-connector',
        request: makeRequest(),
        logger: makeLogger(),
      });

      const result = await extractor.extract({
        userMessage: 'test',
        assistantResponse: 'test',
      });

      expect(result.semantic.length).toBeLessThanOrEqual(5);
    });

    it('caps episodic memories at 5 per round', async () => {
      const manyEpisodic = {
        semantic: [],
        episodic: Array.from({ length: 8 }, (_, i) => ({
          summary: `Event ${i}`,
          full: `Full event ${i}`,
          confidence: 0.75,
        })),
        procedural: [],
      };

      const inference = makeInference(JSON.stringify(manyEpisodic));
      const extractor = new MemoryExtractor({
        inference,
        connectorId: 'test-connector',
        request: makeRequest(),
        logger: makeLogger(),
      });

      const result = await extractor.extract({
        userMessage: 'test',
        assistantResponse: 'test',
      });

      expect(result.episodic.length).toBeLessThanOrEqual(5);
    });

    it('caps procedural memories at 3 per round', async () => {
      const manyProcedural = {
        semantic: [],
        episodic: [],
        procedural: Array.from({ length: 6 }, (_, i) => ({
          summary: `Rule ${i}`,
          full: `Full rule ${i}`,
          confidence: 0.7,
        })),
      };

      const inference = makeInference(JSON.stringify(manyProcedural));
      const extractor = new MemoryExtractor({
        inference,
        connectorId: 'test-connector',
        request: makeRequest(),
        logger: makeLogger(),
      });

      const result = await extractor.extract({
        userMessage: 'test',
        assistantResponse: 'test',
      });

      expect(result.procedural.length).toBeLessThanOrEqual(3);
    });

    it('returns empty result when LLM returns invalid JSON', async () => {
      const inference = makeInference('This is not JSON at all');
      const extractor = new MemoryExtractor({
        inference,
        connectorId: 'test-connector',
        request: makeRequest(),
        logger: makeLogger(),
      });

      const result = await extractor.extract({
        userMessage: 'test',
        assistantResponse: 'test',
      });

      expect(result.semantic).toHaveLength(0);
      expect(result.episodic).toHaveLength(0);
      expect(result.procedural).toHaveLength(0);
    });

    it('returns empty result when inference call throws', async () => {
      const failingInference = {
        getClient: jest.fn().mockReturnValue({
          chatComplete: jest.fn().mockRejectedValue(new Error('LLM unavailable')),
        }),
      } as unknown as InferenceServerStart;

      const extractor = new MemoryExtractor({
        inference: failingInference,
        connectorId: 'test-connector',
        request: makeRequest(),
        logger: makeLogger(),
      });

      const result = await extractor.extract({
        userMessage: 'test',
        assistantResponse: 'test',
      });

      expect(result.semantic).toHaveLength(0);
      expect(result.episodic).toHaveLength(0);
      expect(result.procedural).toHaveLength(0);
    });

    it('returns empty result when LLM returns empty content', async () => {
      const inference = makeInference('');
      const extractor = new MemoryExtractor({
        inference,
        connectorId: 'test-connector',
        request: makeRequest(),
        logger: makeLogger(),
      });

      const result = await extractor.extract({
        userMessage: 'test',
        assistantResponse: 'test',
      });

      expect(result.semantic).toHaveLength(0);
    });

    it('includes suggested_links for semantic candidates', async () => {
      const withLinks = {
        semantic: [
          {
            summary: 'Related to existing memory',
            full: 'This references another memory',
            confidence: 0.8,
            suggested_links: ['mem-001', 'mem-002'],
          },
        ],
        episodic: [],
        procedural: [],
      };

      const inference = makeInference(JSON.stringify(withLinks));
      const extractor = new MemoryExtractor({
        inference,
        connectorId: 'test-connector',
        request: makeRequest(),
        logger: makeLogger(),
      });

      const result = await extractor.extract({
        userMessage: 'test',
        assistantResponse: 'test',
      });

      expect(result.semantic[0].suggested_links).toEqual(['mem-001', 'mem-002']);
    });

    it('skips candidates with missing or empty summary', async () => {
      const withMissingSummary = {
        semantic: [
          { summary: '', full: 'no summary', confidence: 0.8 },
          { summary: 'Valid summary', full: 'valid content', confidence: 0.8 },
        ],
        episodic: [],
        procedural: [],
      };

      const inference = makeInference(JSON.stringify(withMissingSummary));
      const extractor = new MemoryExtractor({
        inference,
        connectorId: 'test-connector',
        request: makeRequest(),
        logger: makeLogger(),
      });

      const result = await extractor.extract({
        userMessage: 'test',
        assistantResponse: 'test',
      });

      expect(result.semantic).toHaveLength(1);
      expect(result.semantic[0].summary).toBe('Valid summary');
    });

    it('clamps confidence to [0, 1] range', async () => {
      const outOfRangeConfidence = {
        semantic: [{ summary: 'High conf', full: 'content', confidence: 1.5 }],
        episodic: [{ summary: 'Negative conf', full: 'content', confidence: -0.1 }],
        procedural: [],
      };

      const inference = makeInference(JSON.stringify(outOfRangeConfidence));
      const extractor = new MemoryExtractor({
        inference,
        connectorId: 'test-connector',
        request: makeRequest(),
        logger: makeLogger(),
      });

      const result = await extractor.extract({
        userMessage: 'test',
        assistantResponse: 'test',
      });

      // 1.5 is clamped to 1.0 but still >= 0.4
      expect(result.semantic).toHaveLength(1);
      expect(result.semantic[0].confidence).toBe(1.0);

      // -0.1 is filtered (below 0.4 threshold)
      expect(result.episodic).toHaveLength(0);
    });
  });
});

// ---------------------------------------------------------------------------
// Tests: buildExtractionInputFromRound
// ---------------------------------------------------------------------------

describe('buildExtractionInputFromRound', () => {
  const makeRound = (overrides: Partial<ConversationRound> = {}): ConversationRound => ({
    id: 'round-001',
    status: ConversationRoundStatus.completed,
    input: { message: 'What is Elasticsearch?' },
    response: { message: 'Elasticsearch is a search engine.' },
    steps: [],
    started_at: new Date().toISOString(),
    time_to_first_token: 100,
    time_to_last_token: 500,
    model_usage: {
      connector_id: 'test-connector',
      llm_calls: 1,
      input_tokens: 100,
      output_tokens: 50,
    },
    ...overrides,
  });

  it('extracts user message and assistant response', () => {
    const round = makeRound();
    const input = buildExtractionInputFromRound(round);

    expect(input.userMessage).toBe('What is Elasticsearch?');
    expect(input.assistantResponse).toBe('Elasticsearch is a search engine.');
    expect(input.toolCalls).toBeUndefined();
  });

  it('extracts tool calls from steps', () => {
    const round = makeRound({
      steps: [
        {
          type: ConversationRoundStepType.toolCall,
          tool_call_id: 'tc-001',
          tool_id: 'search',
          params: { query: 'test' },
          results: [{ type: 'text' as any, data: 'search results', tool_result_id: 'r-001' }],
        },
      ],
    });

    const input = buildExtractionInputFromRound(round);
    expect(input.toolCalls).toHaveLength(1);
    expect(input.toolCalls![0].tool_id).toBe('search');
  });
});
