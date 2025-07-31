/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export { createPrompt } from './create_prompt';
export type {
  PromptAPI,
  PromptCompositeResponse,
  PromptOptions,
  PromptResponse,
  PromptStreamResponse,
} from './api';
export type { BoundPromptAPI, UnboundPromptOptions } from './bound_api';
export type { Prompt, PromptFactory, PromptVersion, ToolOptionsOfPrompt } from './types';
