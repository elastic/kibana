/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OutputOptions, OutputCompositeResponse } from './api';
import type { ToolSchema } from '../chat_complete/tool_schema';
import { UnboundOptions } from '../bind/bind_api';

/**
 * Options used to call the {@link BoundOutputAPI}
 */
export type UnboundOutputOptions<
  TId extends string = string,
  TOutputSchema extends ToolSchema | undefined = ToolSchema | undefined,
  TStream extends boolean = false
> = UnboundOptions<OutputOptions<TId, TOutputSchema, TStream>>;

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
