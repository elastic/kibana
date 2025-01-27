/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { toBooleanRt } from '@kbn/io-ts-utils';
import {
  type Conversation,
  type ConversationCreateRequest,
  type ConversationRequestBase,
  type ConversationUpdateRequest,
  type Message,
  MessageRole,
  type ObservabilityAIAssistantScreenContextRequest,
  type StarterPrompt,
} from '../../common/types';

export const messageRt: t.Type<Message> = t.type({
  '@timestamp': t.string,
  message: t.intersection([
    t.type({
      role: t.union([
        t.literal(MessageRole.System),
        t.literal(MessageRole.Assistant),
        t.literal(MessageRole.Function),
        t.literal(MessageRole.User),
        t.literal(MessageRole.Elastic),
      ]),
    }),
    t.partial({
      content: t.string,
      name: t.string,
      event: t.string,
      data: t.string,
      function_call: t.intersection([
        t.type({
          name: t.string,
          trigger: t.union([
            t.literal(MessageRole.Assistant),
            t.literal(MessageRole.User),
            t.literal(MessageRole.Elastic),
          ]),
        }),
        t.partial({
          arguments: t.string,
        }),
      ]),
    }),
  ]),
});

const tokenCountRt = t.type({
  prompt: t.number,
  completion: t.number,
  total: t.number,
});

export const baseConversationRt: t.Type<ConversationRequestBase> = t.type({
  '@timestamp': t.string,
  conversation: t.intersection([
    t.type({
      title: t.string,
    }),
    t.partial({
      token_count: tokenCountRt,
    }),
  ]),
  messages: t.array(messageRt),
  labels: t.record(t.string, t.string),
  numeric_labels: t.record(t.string, t.number),
  public: toBooleanRt,
});

export const assistantScopeType = t.union([
  t.literal('observability'),
  t.literal('search'),
  t.literal('all'),
]);

export const conversationCreateRt: t.Type<ConversationCreateRequest> = t.intersection([
  baseConversationRt,
  t.type({
    conversation: t.type({
      title: t.string,
    }),
  }),
]);

export const conversationUpdateRt: t.Type<ConversationUpdateRequest> = t.intersection([
  baseConversationRt,
  t.type({
    conversation: t.intersection([
      t.type({
        id: t.string,
        title: t.string,
      }),
      t.partial({
        token_count: tokenCountRt,
      }),
    ]),
  }),
]);

export const conversationRt: t.Type<Conversation> = t.intersection([
  baseConversationRt,
  t.intersection([
    t.type({
      namespace: t.string,
      conversation: t.intersection([
        t.type({
          id: t.string,
          last_updated: t.string,
        }),
        t.partial({
          token_count: tokenCountRt,
        }),
      ]),
    }),
    t.partial({
      user: t.intersection([t.type({ name: t.string }), t.partial({ id: t.string })]),
    }),
  ]),
]);

export const functionRt = t.intersection([
  t.type({
    name: t.string,
    description: t.string,
  }),
  t.partial({
    parameters: t.any,
  }),
]);

export const starterPromptRt: t.Type<StarterPrompt> = t.intersection([
  t.type({
    title: t.string,
    prompt: t.string,
    icon: t.any,
  }),
  t.partial({ scopes: t.array(assistantScopeType) }),
]);

export const screenContextRt: t.Type<ObservabilityAIAssistantScreenContextRequest> = t.partial({
  description: t.string,
  data: t.array(
    t.type({
      name: t.string,
      description: t.string,
      value: t.any,
    })
  ),
  actions: t.array(functionRt),
  screenDescription: t.string,
  starterPrompts: t.array(starterPromptRt),
});
