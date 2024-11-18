/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatCompleteOptions, ChatCompleteCompositeResponse } from './api';
import type { ToolOptions } from './tools';

/**
 * Static options used to call the {@link BoundChatCompleteAPI}
 */
export type StaticChatCompleteOptions<
  TToolOptions extends ToolOptions = ToolOptions,
  TStream extends boolean = false
> = Pick<ChatCompleteOptions<TToolOptions, TStream>, 'connectorId' | 'functionCalling'>;

/**
 * Options used to call the {@link BoundChatCompleteAPI}
 */
export type DynamicChatCompleteOptions<
  TToolOptions extends ToolOptions = ToolOptions,
  TStream extends boolean = false
> = Omit<ChatCompleteOptions<TToolOptions, TStream>, 'connectorId' | 'functionCalling'>;

/**
 * Version of {@link ChatCompleteAPI} that got pre-bound to a set of static parameters
 */
export type BoundChatCompleteAPI = <
  TToolOptions extends ToolOptions = ToolOptions,
  TStream extends boolean = false
>(
  options: DynamicChatCompleteOptions<TToolOptions, TStream>
) => ChatCompleteCompositeResponse<TToolOptions, TStream>;
