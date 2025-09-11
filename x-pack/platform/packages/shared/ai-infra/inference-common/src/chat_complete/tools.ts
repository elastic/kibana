/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolSchema } from './tool_schema';

/**
 * Tool invocation choice type.
 *
 * Refer to {@link ToolChoice} for more details.
 */
export enum ToolChoiceType {
  none = 'none',
  auto = 'auto',
  required = 'required',
}

/**
 * Represent a tool choice where the LLM is forced to call a specific tool.
 *
 * Refer to {@link ToolChoice} for more details.
 */
export interface CustomToolChoice<TToolName extends string = string> {
  function: TToolName;
}

/**
 * Defines the tool invocation for {@link ToolOptions}, either a {@link ToolChoiceType} or {@link CustomToolChoice}.
 * - {@link ToolChoiceType.none}: the LLM will never call a tool
 * - {@link ToolChoiceType.auto}: the LLM will decide if it should call a tool or provide a text response
 * - {@link ToolChoiceType.required}: the LLM will always call a tool, but will decide with one to call
 * - {@link CustomToolChoice}: the LLM will always call the specified tool
 */
export type ToolChoice<TToolName extends string = string> =
  | ToolChoiceType
  | CustomToolChoice<TToolName>;

/**
 * The definition of a tool that will be provided to the LLM for it to eventually call.
 */
export interface ToolDefinition<
  TToolSchema extends ToolSchema | undefined = ToolSchema | undefined
> {
  /**
   * A description of what the tool does. Note that this will be exposed to the LLM,
   * so the description should be explicit about what the tool does and when to call it.
   */
  description: string;
  /**
   * The input schema for the tool, representing the shape of the tool's parameters
   *
   * Even if optional, it is highly recommended to define a schema for all tool definitions, unless
   * the tool is supposed to be called without parameters.
   */
  schema?: TToolSchema;
}
/**
 * Represents a tool call from the LLM before correctly converted to the schema type.
 *
 * Only publicly exposed because referenced by {@link ChatCompletionToolValidationError}
 */
export interface UnvalidatedToolCall<TName extends string = string> {
  toolCallId: string;
  function: {
    name: TName;
    arguments: string;
  };
}

/**
 * The shape of tool call arguments (`toolCalls[number].arguments`).
 */
export interface ToolCallArguments {
  [x: string]: unknown;
}

/**
 * Represents a tool call performed by the LLM.
 */
export interface ToolCall<
  TName extends string = string,
  TArguments extends ToolCallArguments = ToolCallArguments
> {
  /**
   * The id of the tool call, that must be re-used when providing the tool call response
   */
  toolCallId: string;
  function: {
    /**
     * The name of the tool that was called
     */
    name: TName;
    arguments: TArguments;
  };
}

export type ToolResponseString = string;

export type ToolResponseStructured = Record<string, unknown>;

export type ToolResponse = ToolResponseString | ToolResponseStructured;

export type ToolData = Record<string, unknown>;

export interface ToolCallbackResult {
  response: ToolResponse;
  data?: ToolData;
}

export type ToolCallback<
  TToolCall extends ToolCall = ToolCall,
  TToolCallbackResult extends ToolCallbackResult = ToolCallbackResult
> = (toolCall: TToolCall) => Promise<TToolCallbackResult>;

export interface ToolDefinitions {
  [x: string]: ToolDefinition;
}

/**
 * Tool-related parameters of {@link ChatCompleteAPI}
 */
export interface ToolOptions<
  TToolDefinitions extends ToolDefinitions = ToolDefinitions,
  TToolChoice extends ToolChoice<keyof ToolDefinitions & string> = ToolChoice<
    keyof ToolDefinitions & string
  >
> {
  /**
   * The choice of tool execution.
   *
   * Refer to {@link ToolChoice}
   */
  toolChoice?: TToolChoice;
  /**
   * The list of tool definitions that will be exposed to the LLM.
   *
   * Refer to {@link ToolDefinition}.
   */
  tools?: TToolDefinitions;
}
