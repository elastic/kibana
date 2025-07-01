/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MlInferenceResponseResult } from '@elastic/elasticsearch/lib/api/types';
import { anonymizeMessages } from './anonymize_messages';
import {
  AnonymizationRule,
  AssistantMessage,
  Message,
  MessageRole,
  UserMessage,
} from '@kbn/inference-common';
import { messageToAnonymizationRecords } from './message_to_anonymization_records';
import { getEntityMask } from './get_entity_mask';

const mockEsClient = {
  ml: {
    inferTrainedModel: jest.fn(),
  },
} as any;

describe('anonymizeMessages', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const setupMockResponse = (entities: MlInferenceResponseResult[]) => {
    mockEsClient.ml.inferTrainedModel.mockResolvedValue({
      inference_results: entities,
    });
  };

  const nerRule: AnonymizationRule = {
    type: 'NER',
    enabled: true,
    modelId: 'model-1',
  };

  const disabledRule: AnonymizationRule = { ...nerRule, enabled: false };

  const regexRule: AnonymizationRule = {
    type: 'RegExp',
    enabled: true,
    entityClass: 'EMAIL',
    pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
  };

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

    const serialized = messageToAnonymizationRecords(messages[0]);

    setupMockResponse([
      {
        predicted_value: '',
        entities: [
          {
            entity: 'Bob',
            class_name: 'PER',
            class_probability: 0.9828533515650252,
            start_pos: serialized.data!.indexOf('Bob'),
            end_pos: serialized.data!.indexOf('Bob') + 3,
          },
        ],
      },
    ]);

    // Execute
    const result = await anonymizeMessages({
      messages,
      anonymizationRules: [nerRule],
      esClient: mockEsClient,
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

    setupMockResponse([
      {
        entities: [],
      },
    ]);

    await expect(
      anonymizeMessages({
        messages,
        anonymizationRules: [nerRule],
        esClient: mockEsClient,
      })
    ).resolves.toBeDefined();
  });

  it('returns original messages when all rules are disabled', async () => {
    const messages: Message[] = [{ role: MessageRole.User, content: 'Nothing to see here' }];

    const result = await anonymizeMessages({
      messages,
      anonymizationRules: [disabledRule],
      esClient: mockEsClient,
    });

    expect(result.messages).toBe(messages); // same reference
    expect(result.anonymizations.length).toBe(0);
    expect(mockEsClient.ml.inferTrainedModel).not.toHaveBeenCalled();
  });

  it('maintains ordering with multiple messages', async () => {
    const messages: Message[] = [
      { role: MessageRole.User, content: 'First' },
      { role: MessageRole.Assistant, content: 'Second' },
    ];

    const result = await anonymizeMessages({
      messages,
      anonymizationRules: [disabledRule],
      esClient: mockEsClient,
    });

    expect((result.messages[0] as UserMessage).content).toBe('First');
    expect((result.messages[1] as AssistantMessage).content).toBe('Second');
  });

  it('handles content parts', async () => {
    const messages: Message[] = [
      {
        role: MessageRole.User,
        content: [
          {
            text: 'foo',
            type: 'text',
          },
          {
            text: 'jorge21@gmail.com',
            type: 'text',
          },
        ],
      },
    ];

    const result = await anonymizeMessages({
      messages,
      anonymizationRules: [regexRule],
      esClient: mockEsClient,
    });

    expect((result.messages[0] as UserMessage).content).toEqual([
      {
        type: 'text',
        text: 'foo',
      },
      {
        type: 'text',
        text: getEntityMask({ class_name: 'EMAIL', value: 'jorge21@gmail.com' }),
      },
    ]);
  });

  it('anonymizes assistant message with multiple tool calls', async () => {
    const messages = [
      {
        role: MessageRole.Assistant,
        content: '',
        toolCalls: [
          {
            function: {
              name: 'search',
              arguments: { query: 'Find Bob in db' },
            },
            toolCallId: '1',
          },
          {
            function: {
              name: 'lookup',
              arguments: { query: 'Bob details' },
            },
            toolCallId: '2',
          },
        ],
      } as Omit<AssistantMessage, 'toolCalls'> & {
        toolCalls: Array<{
          toolCallId: string;
          function: { name: string; arguments: { query: string } };
        }>;
      },
    ];

    const serialized = messageToAnonymizationRecords(messages[0]);

    setupMockResponse([
      {
        predicted_value: '',
        entities: [
          {
            entity: 'Bob',
            class_name: 'PER',
            class_probability: 0.99,
            start_pos: serialized.data!.indexOf('Bob'),
            end_pos: serialized.data!.indexOf('Bob') + 3,
          },
          {
            entity: 'Bob',
            class_name: 'PER',
            class_probability: 0.99,
            start_pos: serialized.data!.lastIndexOf('Bob'),
            end_pos: serialized.data!.lastIndexOf('Bob') + 3,
          },
        ],
      },
    ]);

    const result = await anonymizeMessages({
      messages,
      anonymizationRules: [nerRule],
      esClient: mockEsClient,
    });

    const assistant = result.messages[0] as (typeof messages)[0];

    assistant.toolCalls.forEach((call) => {
      expect(call.function.arguments.query).not.toContain('Bob');
    });
  });
});
