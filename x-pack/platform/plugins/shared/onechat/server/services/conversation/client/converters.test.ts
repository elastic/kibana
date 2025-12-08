/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation } from '@kbn/onechat-common';
import { isToolCallStep, ConversationRoundStepType, ToolResultType } from '@kbn/onechat-common';
import { getToolResultId } from '@kbn/onechat-server/tools/utils';

import { fromEs, toEs, type Document as ConversationDocument } from './converters';
import { expect } from '@kbn/scout';

jest.mock('@kbn/onechat-server/tools/utils');

const getToolResultIdMock = getToolResultId as jest.MockedFn<typeof getToolResultId>;

describe('conversation model converters', () => {
  const creationDate = '2024-09-04T06:44:17.944Z';
  const updateDate = '2025-08-04T06:44:19.123Z';
  const roundCreationDate = '2025-08-04T07:42:20.789Z';

  beforeEach(() => {
    getToolResultIdMock.mockReturnValue('some-result-id');
  });

  describe('fromEs', () => {
    const documentBase = (): ConversationDocument => {
      return {
        _id: 'conv_id',
        _source: {
          agent_id: 'agent_id',
          title: 'conv_title',
          user_id: 'user_id',
          user_name: 'user_name',
          space: 'space',
          conversation_rounds: [
            {
              id: 'round-1',
              input: {
                message: 'some message',
              },
              response: {
                message: 'some response',
              },
              steps: [],
              started_at: roundCreationDate,
              time_to_first_token: 42,
              time_to_last_token: 100,
              model_usage: {
                connector_id: 'unknown',
                llm_calls: 1,
                input_tokens: 12,
                output_tokens: 42,
              },
            },
          ],
          created_at: creationDate,
          updated_at: updateDate,
        },
      };
    };

    it('deserializes the conversation with new conversation_rounds field', () => {
      const serialized = documentBase();

      const deserialized = fromEs(serialized);

      expect(deserialized).toEqual({
        id: 'conv_id',
        title: 'conv_title',
        agent_id: 'agent_id',
        user: {
          id: 'user_id',
          username: 'user_name',
        },
        created_at: '2024-09-04T06:44:17.944Z',
        updated_at: '2025-08-04T06:44:19.123Z',
        rounds: [
          {
            id: 'round-1',
            input: {
              message: 'some message',
            },
            response: {
              message: 'some response',
            },
            steps: [],
            started_at: roundCreationDate,
            time_to_first_token: 42,
            time_to_last_token: 100,
            model_usage: {
              connector_id: 'unknown',
              llm_calls: 1,
              input_tokens: 12,
              output_tokens: 42,
            },
          },
        ],
      });
    });

    it('deserializes the conversation with legacy rounds field', () => {
      const serialized = documentBase();
      // @ts-ignore simulating legacy document
      delete serialized._source.conversation_rounds;
      serialized._source!.rounds = [
        {
          id: 'round-legacy',
          input: {
            message: 'legacy message',
          },
          response: {
            message: 'legacy response',
          },
          steps: [],
          started_at: roundCreationDate,
          time_to_first_token: 0,
          time_to_last_token: 0,
          model_usage: {
            connector_id: 'unknown',
            llm_calls: 1,
            input_tokens: 12,
            output_tokens: 42,
          },
        },
      ];

      const deserialized = fromEs(serialized);

      expect(deserialized).toEqual({
        id: 'conv_id',
        title: 'conv_title',
        agent_id: 'agent_id',
        user: {
          id: 'user_id',
          username: 'user_name',
        },
        created_at: '2024-09-04T06:44:17.944Z',
        updated_at: '2025-08-04T06:44:19.123Z',
        rounds: [
          {
            id: 'round-legacy',
            input: {
              message: 'legacy message',
            },
            response: {
              message: 'legacy response',
            },
            steps: [],
            started_at: roundCreationDate,
            time_to_first_token: 0,
            time_to_last_token: 0,
            model_usage: {
              connector_id: 'unknown',
              llm_calls: 1,
              input_tokens: 12,
              output_tokens: 42,
            },
          },
        ],
      });
    });

    it('deserializes the steps', () => {
      const serialized = documentBase();
      serialized._source!.conversation_rounds[0].steps = [
        {
          type: ConversationRoundStepType.toolCall,
          tool_call_id: 'tool_call_id',
          tool_id: 'tool_id',
          params: {
            param1: 'value1',
          },
          results: '[{"type":"other","data":{"someData":"someValue"}}]',
        },
        {
          type: ConversationRoundStepType.reasoning,
          reasoning: 'reasoning',
        },
      ];

      const deserialized = fromEs(serialized);

      expect(deserialized.rounds[0].steps).toEqual([
        {
          type: ConversationRoundStepType.toolCall,
          tool_call_id: 'tool_call_id',
          tool_id: 'tool_id',
          params: {
            param1: 'value1',
          },
          progression: [],
          results: [
            {
              tool_result_id: 'some-result-id',
              type: ToolResultType.other,
              data: { someData: 'someValue' },
            },
          ],
        },
        {
          type: ConversationRoundStepType.reasoning,
          reasoning: 'reasoning',
        },
      ]);
    });

    it('adds tool_call_id for results without it', () => {
      const serialized = documentBase();
      serialized._source!.conversation_rounds[0].steps = [
        {
          type: ConversationRoundStepType.toolCall,
          tool_call_id: 'tool_call_id',
          tool_id: 'tool_id',
          params: {
            param1: 'value1',
          },
          results:
            '[{"tool_result_id": "foo", "type":"other","data":{"someData":"someValue"}}, {"type":"other","data":{"someData":"someValue"}}]',
        },
        {
          type: ConversationRoundStepType.reasoning,
          reasoning: 'reasoning',
        },
      ];

      const deserialized = fromEs(serialized);

      const results = deserialized.rounds[0].steps
        .filter(isToolCallStep)
        .flatMap((step) => step.results);

      expect(results.map((result) => result.tool_result_id)).toEqual(['foo', 'some-result-id']);
    });
  });

  describe('toEs', () => {
    const conversationBase = (): Conversation => {
      return {
        id: 'conv_id',
        agent_id: 'agent_id',
        user: { id: 'user_id', username: 'user_name' },
        title: 'conv_title',
        created_at: creationDate,
        updated_at: updateDate,
        rounds: [
          {
            id: 'round-1',
            input: {
              message: 'some message',
            },
            steps: [],
            response: {
              message: 'some response',
            },
            started_at: roundCreationDate,
            time_to_first_token: 42,
            time_to_last_token: 100,
            model_usage: {
              connector_id: 'unknown',
              llm_calls: 1,
              input_tokens: 12,
              output_tokens: 42,
            },
          },
        ],
      };
    };

    it('serializes the conversation using new conversation_rounds field', () => {
      const conversation = conversationBase();
      const serialized = toEs(conversation, 'another-space');

      expect(serialized).toEqual({
        agent_id: 'agent_id',
        title: 'conv_title',
        user_id: 'user_id',
        user_name: 'user_name',
        space: 'another-space',
        conversation_rounds: [
          {
            id: 'round-1',
            input: {
              message: 'some message',
            },
            response: {
              message: 'some response',
            },
            steps: [],
            started_at: roundCreationDate,
            time_to_first_token: 42,
            time_to_last_token: 100,
            model_usage: {
              connector_id: 'unknown',
              llm_calls: 1,
              input_tokens: 12,
              output_tokens: 42,
            },
          },
        ],
        created_at: creationDate,
        updated_at: updateDate,
      });
      // Verify rounds is not present
      expect(serialized.rounds).toBeUndefined();
    });

    it('serializes the steps', () => {
      const conversation = conversationBase();
      conversation.rounds[0].steps = [
        {
          type: ConversationRoundStepType.toolCall,
          tool_call_id: 'tool_call_id',
          tool_id: 'tool_id',
          params: { param1: 'value1' },
          results: [
            { tool_result_id: 'foo', type: ToolResultType.other, data: { someData: 'someValue' } },
          ],
        },
        {
          type: ConversationRoundStepType.reasoning,
          reasoning: 'reasoning',
        },
      ];
      const serialized = toEs(conversation, 'space');

      expect(serialized.conversation_rounds[0].steps).toEqual([
        {
          type: ConversationRoundStepType.toolCall,
          tool_call_id: 'tool_call_id',
          tool_id: 'tool_id',
          params: {
            param1: 'value1',
          },
          results: '[{"tool_result_id":"foo","type":"other","data":{"someData":"someValue"}}]',
        },
        {
          type: ConversationRoundStepType.reasoning,
          reasoning: 'reasoning',
        },
      ]);
    });
  });
});
