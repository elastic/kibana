/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectAssignable, expectType } from 'tsd';
import { z } from '@kbn/zod';
import type { Assign } from 'utility-types';
import type {
  PromptAPI,
  PromptCompositeResponse,
  PromptOptions,
  PromptResponse,
  PromptResponseOf,
  PromptStreamResponse,
} from '../api';
import type { Prompt, PromptVersion, MustachePromptTemplate } from '../types';
import type { ToolDefinition } from '../../chat_complete/tools';
import { ToolChoiceType } from '../../chat_complete/tools';
import type {
  ToolCallArgumentsOfToolDefinition,
  ToolCallOfToolOptions,
} from '../../chat_complete/tools_of';

declare const mockApi: PromptAPI;

const MinimalPromptInputSchema = z.object({
  query: z.string(),
});
type MinimalPromptInput = z.input<typeof MinimalPromptInputSchema>;
const minimalInput: MinimalPromptInput = { query: 'test' };

const mustacheTemplate: MustachePromptTemplate = {
  mustache: {
    template: 'User query: {{query}}',
  },
};

const getWeatherToolDefinition = {
  schema: {
    type: 'object',
    properties: { location: { type: 'string' } },
    required: ['location' as const],
  },
  description: 'Get weather',
} satisfies ToolDefinition;

const getStockPriceToolDefinition = {
  schema: {
    type: 'object',
    properties: { ticker: { type: 'string' } },
    required: ['ticker'],
  },
  description: 'Get stock price',
} satisfies ToolDefinition;

const promptTools = {
  get_weather: getWeatherToolDefinition,
  get_stock_price: getStockPriceToolDefinition,
};

type PromptTools = typeof promptTools;

/**
 * Prompts for testing
 */
const promptNoTools = {
  name: 'NoToolsPrompt',
  description: 'A prompt with no tools defined in its version.',
  input: MinimalPromptInputSchema,
  versions: [
    {
      template: mustacheTemplate,
      // No tools or toolChoice here
    } satisfies PromptVersion,
  ],
} satisfies Prompt<MinimalPromptInput>;

type PromptNoTools = typeof promptNoTools;

const promptWithTools = {
  name: 'WithToolsPrompt',
  description: 'A prompt with tools',
  input: MinimalPromptInputSchema,
  versions: [
    {
      template: mustacheTemplate,
      tools: promptTools,
    } satisfies PromptVersion<PromptTools>,
  ],
} satisfies Prompt<MinimalPromptInput>;

type PromptWithTools = typeof promptWithTools;

const promptWithGetWeatherToolChoice = {
  name: 'WithToolsSpecificPrompt',
  description: 'A prompt with tools and specific toolChoice.',
  input: MinimalPromptInputSchema,
  versions: [
    {
      template: mustacheTemplate,
      tools: promptTools,
    } satisfies PromptVersion<PromptTools>,
  ],
} satisfies Prompt<MinimalPromptInput>;

/**
 * Test PromptResponse type
 */

// No tools in prompt version
declare const noToolsPromptResponse: Awaited<PromptResponseOf<PromptNoTools>>;

expectType<{ content: string; toolCalls: never[] }>(noToolsPromptResponse);

// With tools defined in prompt version
declare const specificToolPromptResponse: Awaited<PromptResponseOf<PromptWithTools>>;

expectType<{
  content: string;
  toolCalls: Array<{
    toolCallId: string;
    function: {
      name: keyof PromptTools;
      arguments: ToolCallArgumentsOfToolDefinition<PromptTools[keyof PromptTools]>;
    };
  }>;
}>(specificToolPromptResponse);

if (specificToolPromptResponse.toolCalls) {
  const firstToolCall = specificToolPromptResponse.toolCalls[0];
  expectAssignable<'get_weather' | 'get_stock_price'>(firstToolCall.function.name);
}

/**
 * Test PromptCompositeResponse type
 */
type PromptOptsWithTools = PromptOptions<PromptWithTools>;

// stream: false
type CompositeNonStream = PromptCompositeResponse<PromptOptsWithTools & { stream: false }>;

expectType<PromptResponseOf<PromptWithTools>>({} as CompositeNonStream);

// stream: true
type CompositeStream = PromptCompositeResponse<PromptOptsWithTools & { stream: true }>;

expectType<PromptResponseOf<PromptWithTools, true>>({} as CompositeStream);

// stream: boolean
type CompositeResponse = PromptCompositeResponse<Assign<PromptOptsWithTools, { stream: boolean }>>;

expectAssignable<CompositeNonStream | CompositeStream>({} as CompositeResponse);

/**
 * Test PromptAPI runtime inference
 */

// Default stream (false), with tools
const resWithTools = mockApi({
  connectorId: 'c1',
  prompt: promptWithTools,
  input: minimalInput,
});

expectType<Promise<PromptResponse<PromptOptsWithTools>>>(resWithTools);
resWithTools.then((r) => {
  if (r.toolCalls && r.toolCalls.length > 0) {
    expectType<'get_weather' | 'get_stock_price'>(r.toolCalls[0].function.name);
    expectAssignable<ToolCallArgumentsOfToolDefinition<PromptTools[keyof PromptTools]>>(
      r.toolCalls[0].function.arguments
    );
  }
});

// stream: true, with tools
const resStreamWithTools = mockApi({
  connectorId: 'c1',
  prompt: promptWithTools,
  input: minimalInput,
  stream: true,
});

expectType<PromptStreamResponse<PromptOptsWithTools>>(resStreamWithTools);

// New tool definition for API call options
const getGeolocationToolDefinition = {
  schema: {
    type: 'object',
    properties: { address: { type: 'string' } },
    required: ['address'],
  },
  description: 'Get geolocation for an address',
} satisfies ToolDefinition;

const apiCallTools = {
  get_geolocation: getGeolocationToolDefinition,
};

// scenario: no tools in prompt, tools in API call
const resNoPromptToolsWithApiTools = mockApi({
  connectorId: 'c1',
  prompt: promptNoTools,
  input: minimalInput,
  tools: apiCallTools, // Tools provided directly in API call options
  toolChoice: ToolChoiceType.auto,
});

// should just return the tools from the API call
expectType<
  Promise<{
    content: string;
    toolCalls: Array<ToolCallOfToolOptions<{ tools: typeof apiCallTools }>>;
  }>
>(resNoPromptToolsWithApiTools);

resNoPromptToolsWithApiTools.then((r) => {
  expectType<{
    toolCallId: string;
    function: {
      name: 'get_geolocation';
      arguments: {
        address?: string;
      };
    };
  }>(r.toolCalls[0]);
});

// scenario: prompt tools + api tools
const resPromptToolsWithApiTools = mockApi({
  connectorId: 'c1',
  prompt: promptWithTools,
  input: minimalInput,
  extraTools: apiCallTools,
  toolChoice: ToolChoiceType.auto,
});

expectType<
  Promise<PromptResponse<PromptOptions<PromptWithTools> & { tools: typeof apiCallTools }>>
>(resPromptToolsWithApiTools);

// merges tools from prompt with api
resPromptToolsWithApiTools.then((r) => {
  if (r.toolCalls && r.toolCalls.length > 0) {
    expectAssignable<'get_geolocation' | 'get_weather' | 'get_stock_price'>(
      r.toolCalls[0].function.name
    );
  }
});

// scenario: prompt tools + api tools + api tool choice override
const resPromptSpecificToolApiChoiceOverride = mockApi({
  connectorId: 'c1',
  prompt: promptWithGetWeatherToolChoice,
  input: minimalInput,
  tools: promptTools,
  toolChoice: { type: 'function', function: 'get_stock_price' as const },
});

expectType<
  Promise<
    PromptResponse<
      PromptOptions<typeof promptWithGetWeatherToolChoice> & {
        tools: PromptTools;
        toolChoice: { function: 'get_stock_price' };
      }
    >
  >
>(resPromptSpecificToolApiChoiceOverride);

resPromptSpecificToolApiChoiceOverride.then((r) => {
  if (r.toolCalls && r.toolCalls.length > 0) {
    expectType<'get_stock_price'>(r.toolCalls[0].function.name);
  }
});
