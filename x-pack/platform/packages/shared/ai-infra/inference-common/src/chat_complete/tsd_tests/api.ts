/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectAssignable, expectType } from 'tsd';
import type {
  ChatCompleteAPI,
  ChatCompleteCompositeResponse,
  ChatCompleteResponse,
  ChatCompleteStreamResponse,
} from '../api';
import { Message, MessageRole } from '../messages';
import { ToolChoiceType, ToolDefinition, ToolResponseOf } from '../tools';

declare const mockApi: ChatCompleteAPI;
const minimalMessages: Message[] = [{ role: MessageRole.User, content: 'hello' }];

const getWeatherToolDefinition = {
  schema: {
    type: 'object',
    properties: { location: { type: 'string' } },
    required: ['location'],
  },
  description: 'Get weather',
} satisfies ToolDefinition;

const getStockPriceToolDefinition = {
  schema: {
    type: 'object',
    properties: { location: { type: 'string' } },
    required: ['location'],
  },
  description: 'Get weather',
} satisfies ToolDefinition;

const myTools = {
  get_weather: getWeatherToolDefinition,
  get_stock_price: getStockPriceToolDefinition,
};

type MyTools = typeof myTools;

/**
 * No specified settings
 */
declare const defaultToolResponse: ChatCompleteResponse<{}>;

expectType<{ content: string; toolCalls: [] }>(defaultToolResponse);

/**
 * No tools
 */
declare const emptyToolResponse: ChatCompleteResponse<{
  tools: {};
  toolChoice: ToolChoiceType.auto;
}>;

expectType<{ content: string; toolCalls: [] }>(emptyToolResponse);

/**
 * Defined tools
 */
declare const specificToolResponse: ChatCompleteResponse<{
  tools: MyTools;
  toolChoice: ToolChoiceType.auto;
}>;

expectType<{
  content: string;
  toolCalls: Array<{
    toolCallId: string;
    function: {
      name: keyof MyTools;
      arguments: ToolResponseOf<MyTools['get_stock_price'] | MyTools['get_weather']>;
    };
  }>;
}>(specificToolResponse);

if (specificToolResponse.toolCalls && specificToolResponse.toolCalls.length > 0) {
  const firstToolCall = specificToolResponse.toolCalls[0];
  expectAssignable<'get_weather' | 'get_stock_price'>(firstToolCall.function.name);
}

/**
 * stream: false = no streaming
 */
type CompositeNonStream = ChatCompleteCompositeResponse<{
  stream: false;
  tools: MyTools;
  toolChoice: ToolChoiceType.auto;
}>;

expectType<Promise<ChatCompleteResponse<{ tools: MyTools; toolChoice: ToolChoiceType.auto }>>>(
  {} as CompositeNonStream
);
/**
 * stream: false = streaming
 */

type CompositeStream = ChatCompleteCompositeResponse<{
  stream: true;
  tools: MyTools;
  toolChoice: ToolChoiceType.auto;
}>;

/**
 * stream: boolean = union
 */
expectType<ChatCompleteStreamResponse<{ tools: MyTools; toolChoice: ToolChoiceType.auto }>>(
  {} as CompositeStream
);

type CompositeBooleanStream = ChatCompleteCompositeResponse<{
  stream: boolean;
  tools: MyTools;
  toolChoice: ToolChoiceType.auto;
}>;

expectAssignable<
  | Promise<ChatCompleteResponse<{ tools: MyTools; toolChoice: ToolChoiceType.auto }>>
  | ChatCompleteStreamResponse<{ tools: MyTools; toolChoice: ToolChoiceType.auto }>
>({} as CompositeBooleanStream);

/**
 * tools inference for runtime code
 */
const resWithTools = mockApi({
  connectorId: 'c1',
  messages: minimalMessages,
  tools: { get_weather: getWeatherToolDefinition },
});

// defaults to non-streaming
expectType<
  Promise<
    ChatCompleteResponse<{
      tools: { get_weather: typeof getWeatherToolDefinition };
      toolChoice: ToolChoiceType.auto;
    }>
  >
>(resWithTools);
resWithTools.then((r) => {
  if (r.toolCalls) {
    expectType<'get_weather'>(r.toolCalls[0].function.name);
  }
});

/**
 * tools inference for runtime code + stream: true
 */
const resStreamWithTools = mockApi({
  connectorId: 'c1',
  messages: minimalMessages,
  stream: true,
  tools: { get_weather: getWeatherToolDefinition },
});
expectType<
  ChatCompleteStreamResponse<{
    tools: { get_weather: typeof getWeatherToolDefinition };
    toolChoice: ToolChoiceType.auto;
  }>
>(resStreamWithTools);

/**
 * toolChoice = none should be toolCalls:[]
 */

const resToolChoiceNone = mockApi({
  connectorId: 'c1',
  messages: minimalMessages,
  tools: { get_weather: getWeatherToolDefinition },
  toolChoice: ToolChoiceType.none,
});
resToolChoiceNone.then((r) => {
  expectType<[]>(r.toolCalls);
});

/**
 * specific tool choice = only specified tool is typed
 */
const resToolChoiceSpecific = mockApi({
  connectorId: 'c1',
  messages: minimalMessages,
  tools: myTools,
  toolChoice: { type: 'function', function: 'get_weather' as const },
});

expectType<
  Promise<
    ChatCompleteResponse<{
      tools: MyTools;
      toolChoice: { type: 'function'; function: 'get_weather' };
    }>
  >
>(resToolChoiceSpecific);

resToolChoiceSpecific.then((r) => {
  if (r.toolCalls) {
    expectAssignable<
      Array<{
        toolCallId: string;
        function: {
          name: 'get_weather';
          arguments: ToolResponseOf<typeof getWeatherToolDefinition>;
        };
      }>
    >(r.toolCalls);
  }
});
