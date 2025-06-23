/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PromptOptions, PromptCompositeResponse } from './api';
import { Prompt } from './types';

/**
 * Static options used to call the {@link BoundPromptAPI}
 */
export type BoundPromptOptions<TPromptOptions extends PromptOptions = PromptOptions> = Pick<
  PromptOptions<TPromptOptions['prompt']>,
  'connectorId' | 'functionCalling'
>;

/**
 * Options used to call the {@link BoundPromptAPI}
 */
export type UnboundPromptOptions<TPromptOptions extends PromptOptions = PromptOptions> = Omit<
  PromptOptions<TPromptOptions['prompt']>,
  'connectorId' | 'functionCalling'
>;

/**
 * Version of {@link PromptAPI} that got pre-bound to a set of static parameters
 */
export type BoundPromptAPI = <
  TPrompt extends Prompt = Prompt,
  TPromptOptions extends PromptOptions<TPrompt> = PromptOptions<TPrompt>
>(
  options: UnboundPromptOptions<TPromptOptions & { prompt: TPrompt }>
) => PromptCompositeResponse<TPromptOptions & { prompt: TPrompt }>;
