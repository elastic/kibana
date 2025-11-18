/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectAssignable, expectType } from 'tsd';
import type {
  ToolCallOfToolDefinitions,
  ToolCallOfToolOptions,
  ToolCallArgumentsOfToolDefinition,
  ToolCallbacksOfToolOptions,
  ToolNamesOf,
  ToolsOfChoice,
} from '../tools_of';
import type { ToolCall, ToolDefinition } from '../tools';

// Define a couple of concrete tool definitions used across tests
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
    properties: { symbol: { type: 'string' } },
    required: ['symbol' as const],
  },
  description: 'Get stock price',
} satisfies ToolDefinition;

const noArgsToolDefinition = {
  description: 'No-args tool',
} satisfies ToolDefinition<undefined>;

const myTools = {
  get_weather: getWeatherToolDefinition,
  get_stock_price: getStockPriceToolDefinition,
};

type MyTools = typeof myTools;

/**
 * ToolsOfChoice
 */
interface OptionsAuto {
  tools: MyTools;
}
interface OptionsSpecific {
  tools: MyTools;
  toolChoice: { type: 'function'; function: 'get_weather' };
}

type ToolsAuto = ToolsOfChoice<OptionsAuto>;
type ToolsSpecific = ToolsOfChoice<OptionsSpecific>;

declare const toolsAuto: ToolsAuto;
declare const toolsSpecific: ToolsSpecific;

expectAssignable<MyTools>(toolsAuto);
expectAssignable<Pick<MyTools, 'get_weather'>>(toolsSpecific);

/**
 * ToolNamesOf
 */
type Names = ToolNamesOf<OptionsAuto>;
declare const name: Names;
expectAssignable<'get_weather' | 'get_stock_price'>(name);

/**
 * ToolCallArgumentsOfToolDefinition
 */
type WeatherArgs = ToolCallArgumentsOfToolDefinition<typeof getWeatherToolDefinition>;
declare const weatherArgs: WeatherArgs;
expectType<string>(weatherArgs.location);

type StockArgs = ToolCallArgumentsOfToolDefinition<typeof getStockPriceToolDefinition>;
declare const stockArgs: StockArgs;
expectType<string>(stockArgs.symbol);

type WeatherToolCall = ToolCall<'get_weather', WeatherArgs>;
type StockToolCall = ToolCall<'get_stock_price', StockArgs>;

type NoArgs = ToolCallArgumentsOfToolDefinition<typeof noArgsToolDefinition>;
declare const noArgs: NoArgs;
expectType<{}>(noArgs);

/**
 * ToolCallOfToolDefinitions
 */
type Calls = ToolCallOfToolDefinitions<MyTools>;
declare const call: Calls;
expectAssignable<WeatherToolCall | StockToolCall>(call);

/**
 * ToolCallOfToolOptions
 */
type NoneChoice = typeof import('../tools')['ToolChoiceType']['none'];
type CallNone = ToolCallOfToolOptions<{ tools: MyTools; toolChoice: NoneChoice }>;
declare const callNone: CallNone;
expectType<never>(callNone);

type CallAuto = ToolCallOfToolOptions<OptionsAuto>;
declare const callAuto: CallAuto;
expectAssignable<WeatherToolCall | StockToolCall>(callAuto);

type CallSpecific = ToolCallOfToolOptions<OptionsSpecific>;

declare const callSpecific: CallSpecific;
expectAssignable<WeatherToolCall>(callSpecific);

/**
 * ToolCallbacksOfToolOptions
 */
type Callbacks = ToolCallbacksOfToolOptions<OptionsAuto>;

// Provide a value matching the inferred callbacks type
const callbacks: Callbacks = {
  // get_weather callback should receive typed arguments
  async get_weather(toolCall) {
    return { response: {} };
  },
  // get_stock_price callback should receive typed arguments
  async get_stock_price(toolCall) {
    return { response: {} };
  },
};

expectAssignable<Callbacks>(callbacks);
