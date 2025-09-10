/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation } from '@kbn/onechat-common';
import { ConversationRoundStepType, ToolResultType } from '@kbn/onechat-common';
import { fromEs, toEs, type Document as ConversationDocument } from './converters';
import { expect } from '@kbn/scout';

describe('conversation model converters', () => {
  const creationDate = '2024-09-04T06:44:17.944Z';
  const updateDate = '2025-08-04T06:44:19.123Z';

  describe('fromEs', () => {
    const documentBase = (): ConversationDocument => {
      return {
        _id: 'conv_id',
        _source: {
          agent_id: 'agent_id',
          title: 'conv_title',
          user_id: 'user_id',
          user_name: 'user_name',
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
            },
          ],
          created_at: creationDate,
          updated_at: updateDate,
        },
      };
    };

    it('deserialize the conversation', () => {
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
          },
        ],
      });
    });

    it('deserializes the steps', () => {
      const serialized = documentBase();
      serialized._source!.rounds[0].steps = [
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
          },
        ],
      };
    };

    it('serializes the conversation', () => {
      const conversation = conversationBase();
      const serialized = toEs(conversation);

      expect(serialized).toEqual({
        agent_id: 'agent_id',
        title: 'conv_title',
        user_id: 'user_id',
        user_name: 'user_name',
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
          },
        ],
        created_at: creationDate,
        updated_at: updateDate,
      });
    });

    it('serializes the steps', () => {
      const conversation = conversationBase();
      conversation.rounds[0].steps = [
        {
          type: ConversationRoundStepType.toolCall,
          tool_call_id: 'tool_call_id',
          tool_id: 'tool_id',
          params: { param1: 'value1' },
          results: [{ type: ToolResultType.other, data: { someData: 'someValue' } }],
        },
        {
          type: ConversationRoundStepType.reasoning,
          reasoning: 'reasoning',
        },
      ];
      const serialized = toEs(conversation);

      expect(serialized.rounds[0].steps).toEqual([
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
      ]);
    });
  });
});
