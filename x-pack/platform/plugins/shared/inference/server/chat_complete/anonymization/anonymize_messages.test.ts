/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MlInferenceResponseResult } from '@elastic/elasticsearch/lib/api/types';
import { anonymizeMessages, anonymize } from './anonymize_messages';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import {
  AnonymizationRule,
  AssistantMessage,
  Message,
  MessageRole,
  UserMessage,
} from '@kbn/inference-common';

const mockEsClient = {
  ml: {
    inferTrainedModel: jest.fn(),
  },
} as any;

describe('anonymize_messages', () => {
  let logger: MockedLogger;
  beforeEach(() => {
    logger = loggerMock.create();
    jest.resetAllMocks();
  });

  const setupMockResponse = (entities: MlInferenceResponseResult[]) => {
    // Match the structure expected by the deanonymize function
    mockEsClient.ml.inferTrainedModel.mockResolvedValue({
      inference_results: entities,
    });
  };

  const nerRule: AnonymizationRule = {
    type: 'NER',
    enabled: true,
    modelId: 'model-1',
  };
  const nerRule2: AnonymizationRule = {
    type: 'NER',
    enabled: true,
    modelId: 'model-2',
  };

  const regexRule: AnonymizationRule = {
    type: 'RegExp',
    enabled: true,
    entityClass: 'EMAIL',
    pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
  };

  describe('anonymizeMessages', () => {
    it('should anonymize simple text content', async () => {
      const messages: Message[] = [{ role: MessageRole.User, content: 'My name is Alice.' }];

      setupMockResponse([
        {
          predicted_value: '{"content":"My name is [Alice](PER&Alice)."}',
          entities: [
            {
              entity: 'Alice',
              class_name: 'PER',
              class_probability: 0.9828533515650252,
              start_pos: 24,
              end_pos: 29,
            },
          ],
        },
      ]);

      const result = await anonymizeMessages({
        messages,
        anonymizationRules: [nerRule],
        esClient: mockEsClient,
        logger,
      });
      const userMsgResult = result.messages[0] as UserMessage;

      expect(userMsgResult.content).not.toContain('Alice');
      expect(result.anonymizations.length).toBe(1);
      expect(result.anonymizations[0].entity.value).toBe('Alice');
    });

    it('should preserve JSON structure when anonymizing', async () => {
      const messages: Message[] = [
        {
          role: MessageRole.Assistant,
          content: '',
          toolCalls: [
            {
              function: {
                name: 'search',
                arguments: { query: 'Search for Bob in database' },
              },
              toolCallId: '123',
            },
          ],
        },
      ];

      setupMockResponse([
        {
          predicted_value:
            '{"role":"assistant","content":"","toolCalls":[{"function":{"name":"search","arguments":{"query":"Search for Bob in database"}},"toolCallId":"123"}]}',
          entities: [
            {
              entity: 'Bob',
              class_name: 'PER',
              class_probability: 0.9828533515650252,
              start_pos: 90,
              end_pos: 93,
            },
          ],
        },
      ]);

      // Execute
      const result = await anonymizeMessages({
        messages,
        anonymizationRules: [nerRule],
        esClient: mockEsClient,
        logger,
      });

      const assistantMsgResult = result.messages[0] as AssistantMessage & {
        toolCalls: Array<{ function: { arguments: Record<string, any> } }>;
      };
      const args = assistantMsgResult.toolCalls![0].function.arguments;
      expect(args).toHaveProperty('query');
      expect(args.query).not.toContain('Bob');
    });

    it('should handle empty string content', async () => {
      const messages: Message[] = [
        {
          role: MessageRole.Assistant,
          content: '',
          toolCalls: [
            {
              function: {
                name: 'test',
                arguments: {},
              },
              toolCallId: '123',
            },
          ],
        },
      ];

      setupMockResponse([]);

      await expect(
        anonymizeMessages({
          messages,
          anonymizationRules: [nerRule],
          esClient: mockEsClient,
          logger,
        })
      ).resolves.toBeDefined();
    });

    it('should handle multiple entities in a single message', async () => {
      const messages: Message[] = [
        {
          role: MessageRole.User,
          content: 'My name is Alice and I work with Bob.',
        },
      ];

      setupMockResponse([
        {
          predicted_value:
            '{"content":"My name is [Alice](PER&Alice) and I work with [Bob](PER&Bob)."}',
          entities: [
            {
              entity: 'alice',
              class_name: 'PER',
              class_probability: 0.9180164083501762,
              start_pos: 23,
              end_pos: 28,
            },
            {
              entity: 'bob',
              class_name: 'PER',
              class_probability: 0.9275222816369864,
              start_pos: 45,
              end_pos: 48,
            },
          ],
        },
      ]);

      const result = await anonymizeMessages({
        messages,
        anonymizationRules: [nerRule],
        esClient: mockEsClient,
        logger,
      });
      const userMsgResult = result.messages[0] as UserMessage;
      expect(userMsgResult.content).not.toContain('Alice');
      expect(userMsgResult.content).not.toContain('Bob');
      expect(result.anonymizations.length).toBe(2);
    });
  });

  // This test serves a dual purpose: it verifies that subsequent models can add new entities of the same class,
  // and also implicitly checks that entities detected by previous models are not duplicated.
  describe('anonymize', () => {
    it('allows subsequent models to add additional entities of same class', async () => {
      const input = 'Bob and Alice are friends.';

      // First NER model only detects "Alice"
      mockEsClient.ml.inferTrainedModel.mockResolvedValueOnce({
        inference_results: [
          {
            entities: [
              {
                entity: 'Alice',
                class_name: 'PER',
                class_probability: 0.99,
                start_pos: 8,
                end_pos: 13,
              },
            ],
          },
        ],
      });

      // Second NER model (same class) detects an additional entity, "Bob"
      mockEsClient.ml.inferTrainedModel.mockResolvedValueOnce({
        inference_results: [
          {
            entities: [
              {
                entity: 'Bob',
                class_name: 'PER',
                class_probability: 0.97,
                start_pos: 0,
                end_pos: 3,
              },
            ],
          },
        ],
      });

      const result = await anonymize({
        input,
        anonymizationRules: [nerRule, nerRule2],
        esClient: mockEsClient,
      });

      // Ensure that neither original name remains in the output
      expect(result.output).not.toContain('Alice');
      expect(result.output).not.toContain('Bob');

      // Extract the documents passed to the second call and verify it does not include "Alice"
      const secondCallDocs = mockEsClient.ml.inferTrainedModel.mock.calls[1][0].docs;
      expect(secondCallDocs[0]).not.toContain('Alice');

      // Ensure both entities are recorded in the anonymizations array
      expect(result.anonymizations.length).toBe(2);
      const names = result.anonymizations.map((a) => a.entity.value).sort();
      expect(names).toEqual(['Alice', 'Bob']);

      // Both models should have been invoked exactly once
      expect(mockEsClient.ml.inferTrainedModel).toHaveBeenCalledTimes(2);
    });
  });

  it('should apply regex rules correctly', async () => {
    const messages: Message[] = [
      { role: MessageRole.User, content: 'My email is jorge21@gmail.com.' },
    ];

    const result = await anonymizeMessages({
      messages,
      anonymizationRules: [regexRule],
      esClient: mockEsClient,
      logger,
    });
    const userMsgResult = result.messages[0] as UserMessage;
    expect(userMsgResult.content).not.toContain('jorge21@gmail.com');
    expect(result.anonymizations.length).toBe(1);
    expect(result.anonymizations[0].entity.value).toBe('jorge21@gmail.com');
  });
});
