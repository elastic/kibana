/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BoundOptions, UnboundOptions } from '../bind/bind_api';
import type { PromptOptions, PromptAPIResponse } from './api';
import { Prompt } from './types';

/**
 * Options used to call the {@link BoundPromptAPI}
 */
export type UnboundPromptOptions<TPrompt extends Prompt = Prompt> = UnboundOptions<
  PromptOptions<TPrompt>
>;

/**
 * Version of {@link PromptAPI} that got pre-bound to a set of static parameters
 */
export type BoundPromptAPI = <
  TPrompt extends Prompt,
  TPromptOptions extends UnboundPromptOptions<TPrompt>
>(
  options: { prompt: TPrompt } & TPromptOptions
) => PromptAPIResponse<BoundOptions & TPromptOptions>;
