/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectAssignable, expectType } from 'tsd';
import { z } from '@kbn/zod';
import type {
  PromptAPI,
  PromptCompositeResponse,
  PromptOptions,
  PromptResponse,
  PromptResponseOf,
  PromptStreamResponse,
} from '../api';
import type { Prompt, PromptVersion, MustachePromptTemplate } from '../types';
import {
  ToolCallsOf,
  ToolChoiceType,
  ToolDefinition,
  ToolResponseOf,
} from '../../chat_complete/tools';

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
    required: ['location'],
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

const promptWithToolsAuto = {
  name: 'WithToolsAutoPrompt',
  description: 'A prompt with tools and toolChoice:auto.',
  input: MinimalPromptInputSchema,
  versions: [
    {
      template: mustacheTemplate,
      tools: promptTools,
      toolChoice: ToolChoiceType.auto,
    } satisfies PromptVersion<{ tools: PromptTools; toolChoice: ToolChoiceType.auto }>,
  ],
} satisfies Prompt<MinimalPromptInput>;

type PromptWithToolsAuto = typeof promptWithToolsAuto;

const promptWithToolsNone = {
  name: 'WithToolsNonePrompt',
  description: 'A prompt with tools and toolChoice:none.',
  input: MinimalPromptInputSchema,
  versions: [
    {
      template: mustacheTemplate,
      tools: promptTools,
      toolChoice: ToolChoiceType.none,
    } satisfies PromptVersion<{ tools: PromptTools; toolChoice: ToolChoiceType.none }>,
  ],
} satisfies Prompt<MinimalPromptInput>;

const promptWithGetWeatherToolChoice = {
  name: 'WithToolsSpecificPrompt',
  description: 'A prompt with tools and specific toolChoice.',
  input: MinimalPromptInputSchema,
  versions: [
    {
      template: mustacheTemplate,
      tools: promptTools,
      toolChoice: { function: 'get_weather' as const },
    } satisfies PromptVersion<{
      tools: PromptTools;
      toolChoice: { function: 'get_weather' };
    }>,
  ],
} satisfies Prompt<MinimalPromptInput>;

/**
 * Test PromptResponse type
 */

// No tools in prompt version
declare const noToolsPromptResponse: Awaited<PromptResponseOf<PromptNoTools>>;

expectType<{ content: string; toolCalls: [] }>(noToolsPromptResponse);

// With tools defined in prompt version
declare const specificToolPromptResponse: Awaited<PromptResponseOf<PromptWithToolsAuto>>;
expectType<{
  content: string;
  toolCalls: Array<{
    toolCallId: string;
    function: {
      name: keyof PromptTools;
      arguments: ToolResponseOf<PromptTools[keyof PromptTools]>;
    };
  }>;
}>(specificToolPromptResponse);

if (specificToolPromptResponse.toolCalls && specificToolPromptResponse.toolCalls.length > 0) {
  const firstToolCall = specificToolPromptResponse.toolCalls[0];
  expectAssignable<'get_weather' | 'get_stock_price'>(firstToolCall.function.name);
}

/**
 * Test PromptCompositeResponse type
 */
type PromptOptsWithToolsAuto = PromptOptions<PromptWithToolsAuto>;

// stream: false
type CompositeNonStream = PromptCompositeResponse<PromptOptsWithToolsAuto & { stream: false }>;

expectType<PromptResponseOf<PromptWithToolsAuto>>({} as CompositeNonStream);

// stream: true
type PromptOptsWithToolsAutoStreamResponse = PromptStreamResponse<PromptOptsWithToolsAuto>;

expectType<PromptResponseOf<PromptWithToolsAuto, true>>(
  {} as PromptOptsWithToolsAutoStreamResponse
);

// stream: boolean
type CompositeResponse = PromptCompositeResponse<PromptOptsWithToolsAuto & { stream: boolean }>;

expectAssignable<
  Promise<PromptResponse<PromptOptsWithToolsAuto>> | PromptStreamResponse<PromptOptsWithToolsAuto>
>({} as CompositeResponse);

/**
 * Test PromptAPI runtime inference
 */

// Default stream (false), with tools
const resWithTools = mockApi({
  connectorId: 'c1',
  prompt: promptWithToolsAuto,
  input: minimalInput,
});

expectType<Promise<PromptResponse<PromptOptsWithToolsAuto>>>(resWithTools);
resWithTools.then((r) => {
  if (r.toolCalls && r.toolCalls.length > 0) {
    expectType<'get_weather' | 'get_stock_price'>(r.toolCalls[0].function.name);
    expectAssignable<ToolResponseOf<PromptTools[keyof PromptTools]>>(
      r.toolCalls[0].function.arguments
    );
  }
});

// stream: true, with tools
const resStreamWithTools = mockApi({
  connectorId: 'c1',
  prompt: promptWithToolsAuto,
  input: minimalInput,
  stream: true,
});

expectType<PromptStreamResponse<PromptOptsWithToolsAuto>>(resStreamWithTools);

// toolChoice: none
const resToolChoiceNone = mockApi({
  connectorId: 'c1',
  prompt: promptWithToolsNone,
  input: minimalInput,
});
resToolChoiceNone.then((r) => {
  expectType<[]>(r.toolCalls);
});

// toolChoice: specific function
const resToolChoiceSpecific = mockApi({
  connectorId: 'c1',
  prompt: promptWithGetWeatherToolChoice,
  input: minimalInput,
});

expectType<PromptResponseOf<typeof promptWithGetWeatherToolChoice>>(resToolChoiceSpecific);

resToolChoiceSpecific.then((r) => {
  if (r.toolCalls && r.toolCalls.length > 0) {
    // With a specific tool choice, only that tool should be possible.
    // The ToolOptionsOfPrompt<typeof promptWithToolsSpecific> should correctly narrow this.
    expectType<'get_weather'>(r.toolCalls[0].function.name);
    expectType<ToolResponseOf<PromptTools['get_weather']>>(r.toolCalls[0].function.arguments);
  }
});

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
    toolCalls: ToolCallsOf<{ tools: typeof apiCallTools }>['toolCalls'];
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
  prompt: promptWithToolsAuto,
  input: minimalInput,
  tools: apiCallTools,
  toolChoice: ToolChoiceType.auto,
});

expectType<
  Promise<PromptResponse<PromptOptions<PromptWithToolsAuto> & { tools: typeof apiCallTools }>>
>(resPromptToolsWithApiTools);

// merges tools from prompt with api
resPromptToolsWithApiTools.then((r) => {
  if (r.toolCalls && r.toolCalls.length > 0) {
    expectType<'get_geolocation' | 'get_weather' | 'get_stock_price'>(r.toolCalls[0].function.name);
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
