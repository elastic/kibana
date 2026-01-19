/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValuesType } from 'utility-types';
import type { FromToolSchema, ToolSchema } from './tool_schema';
import type {
  CustomToolChoice,
  ToolCall,
  ToolCallback,
  ToolChoiceType,
  ToolDefinition,
  ToolDefinitions,
  ToolOptions,
} from './tools';

/**
 * Filters the specified tools if ToolChoiceType === CustomToolChoice
 */
export type ToolsOfChoice<TToolOptions extends ToolOptions> = TToolOptions['toolChoice'] extends {
  function: infer TToolName;
}
  ? TToolName extends keyof TToolOptions['tools']
    ? Pick<TToolOptions['tools'], TToolName>
    : TToolOptions['tools']
  : TToolOptions['tools'];

/**
 * Utility type to get the tool names of ToolOptions
 */
export type ToolNamesOf<TToolOptions extends ToolOptions> = keyof TToolOptions['tools'] & string;

/**
 * Utility type to infer the tool call response shape.
 */

export type ToolCallArgumentsOfToolDefinition<TToolDefinition extends ToolDefinition> =
  TToolDefinition extends {
    schema: ToolSchema;
  }
    ? FromToolSchema<TToolDefinition['schema']>
    : {};

/**
 * Returns the tool call shape for the given tool definitions.
 */
export type ToolCallOfToolDefinitions<TTools extends ToolDefinitions> = ValuesType<{
  [TToolName in keyof TTools]: ToolCall<
    TToolName & string,
    ToolCallArgumentsOfToolDefinition<TTools[TToolName]>
  >;
}>;

/**
 * Returns the tool call shape for the given tool options.
 */
export type ToolCallOfToolOptions<TToolOptions extends ToolOptions> =
  TToolOptions['toolChoice'] extends ToolChoiceType.none
    ? never
    : TToolOptions['tools'] extends undefined
    ? never
    : TToolOptions['toolChoice'] extends CustomToolChoice
    ? ToolCallOfToolDefinitions<
        Pick<NonNullable<TToolOptions['tools']>, TToolOptions['toolChoice']['function']>
      >
    : ToolCallOfToolDefinitions<NonNullable<TToolOptions['tools']>>;

/**
 * Returns the tool call shape for the given tool options, as an array.
 * This type allows the consumer to incorporate tool choice at the top
 * level, in the sense that it can differentiate between { toolCalls?: ToolCall[] }
 * and { toolCalls?: ToolCall[] }, the former of which is applicable if
 * ToolChoiceType is set to a value that requires the LLM to call a tool.
 */
export type ToolCallsOfToolOptions<TToolOptions extends ToolOptions> =
  TToolOptions['toolChoice'] extends ToolChoiceType.none
    ? never[]
    : TToolOptions['tools'] extends undefined
    ? undefined
    : TToolOptions['toolChoice'] extends CustomToolChoice
    ? Array<
        ToolCallOfToolDefinitions<
          Pick<NonNullable<TToolOptions['tools']>, TToolOptions['toolChoice']['function']>
        >
      >
    : Array<ToolCallOfToolDefinitions<NonNullable<TToolOptions['tools']>>>;

type ToolCallbacksOfTools<TTools extends Record<string, ToolDefinition> | undefined> =
  TTools extends Record<string, ToolDefinition>
    ? {
        [TName in keyof TTools & string]: ToolCallback<
          ToolCall<TName, ToolCallArgumentsOfToolDefinition<TTools[TName]>>
        >;
      }
    : never;

/**
 * Returns the tool callback shapes from the given tool options.
 */
export type ToolCallbacksOfToolOptions<TToolOptions extends ToolOptions> = ToolCallbacksOfTools<
  TToolOptions['tools']
>;
