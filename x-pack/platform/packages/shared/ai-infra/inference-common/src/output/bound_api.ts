/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OutputOptions, OutputCompositeResponse } from './api';
import type { ToolSchema } from '../chat_complete/tool_schema';

/**
 * Static options used to call the {@link BoundOutputAPI}
 */
export type BoundOutputOptions<
  TId extends string = string,
  TOutputSchema extends ToolSchema | undefined = ToolSchema | undefined,
  TStream extends boolean = false
> = Pick<OutputOptions<TId, TOutputSchema, TStream>, 'connectorId' | 'functionCalling'>;

/**
 * Options used to call the {@link BoundOutputAPI}
 */
export type UnboundOutputOptions<
  TId extends string = string,
  TOutputSchema extends ToolSchema | undefined = ToolSchema | undefined,
  TStream extends boolean = false
> = Omit<OutputOptions<TId, TOutputSchema, TStream>, 'connectorId' | 'functionCalling'>;

/**
 * Version of {@link OutputAPI} that got pre-bound to a set of static parameters
 */
export type BoundOutputAPI = <
  TId extends string = string,
  TOutputSchema extends ToolSchema | undefined = ToolSchema | undefined,
  TStream extends boolean = false
>(
  options: UnboundOutputOptions<TId, TOutputSchema, TStream>
) => OutputCompositeResponse<TId, TOutputSchema, TStream>;
