/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValuesType } from 'utility-types';
import { FromToolSchema, ToolSchema } from './tool_schema';

type Assert<TValue, TType> = TValue extends TType ? TValue & TType : never;

type ToolsOfChoice<TToolOptions extends ToolOptions> = TToolOptions['toolChoice'] extends {
  function: infer TToolName;
}
  ? TToolName extends keyof TToolOptions['tools']
    ? Pick<TToolOptions['tools'], TToolName>
    : TToolOptions['tools']
  : TToolOptions['tools'];

/**
 * Utility type to infer the tool calls response shape.
 */
type ToolResponsesOf<TTools extends Record<string, ToolDefinition> | undefined> =
  TTools extends Record<string, ToolDefinition>
    ? Array<
        ValuesType<{
          [TName in keyof TTools]: ToolResponseOf<Assert<TName, string>, TTools[TName]>;
        }>
      >
    : never[];

/**
 * Utility type to infer the tool call response shape.
 */
type ToolResponseOf<TName extends string, TToolDefinition extends ToolDefinition> = ToolCall<
  TName,
  TToolDefinition extends { schema: ToolSchema } ? FromToolSchema<TToolDefinition['schema']> : {}
>;

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
interface CustomToolChoice<TName extends string = string> {
  function: TName;
}

/**
 * Defines the tool invocation for {@link ToolOptions}, either a {@link ToolChoiceType} or {@link CustomToolChoice}.
 * - {@link ToolChoiceType.none}: the LLM will never call a tool
 * - {@link ToolChoiceType.auto}: the LLM will decide if it should call a tool or provide a text response
 * - {@link ToolChoiceType.required}: the LLM will always call a tool, but will decide with one to call
 * - {@link CustomToolChoice}: the LLM will always call the specified tool
 */
export type ToolChoice<TName extends string = string> = ToolChoiceType | CustomToolChoice<TName>;

/**
 * The definition of a tool that will be provided to the LLM for it to eventually call.
 */
export interface ToolDefinition {
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
  schema?: ToolSchema;
}

/**
 * Utility type to infer the toolCall type of {@link ChatCompletionMessageEvent}.
 */
export type ToolCallsOf<TToolOptions extends ToolOptions> = TToolOptions extends {
  tools?: Record<string, ToolDefinition>;
}
  ? TToolOptions extends { toolChoice: ToolChoiceType.none }
    ? { toolCalls: [] }
    : {
        toolCalls: ToolResponsesOf<ToolsOfChoice<TToolOptions>>;
      }
  : { toolCalls: never };

/**
 * Represents a tool call from the LLM before correctly converted to the schema type.
 *
 * Only publicly exposed because referenced by {@link ChatCompletionToolValidationError}
 */
export interface UnvalidatedToolCall {
  toolCallId: string;
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Represents a tool call performed by the LLM.
 */
export interface ToolCall<
  TName extends string = string,
  TArguments extends Record<string, any> | undefined = Record<string, any> | undefined
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
  } & (TArguments extends Record<string, any> ? { arguments: TArguments } : {});
}

/**
 * Tool-related parameters of {@link ChatCompleteAPI}
 */
export interface ToolOptions<TToolNames extends string = string> {
  /**
   * The choice of tool execution.
   *
   * Refer to {@link ToolChoice}
   */
  toolChoice?: ToolChoice<TToolNames>;
  /**
   * The list of tool definitions that will be exposed to the LLM.
   *
   * Refer to {@link ToolDefinition}.
   */
  tools?: Record<TToolNames, ToolDefinition>;
}
