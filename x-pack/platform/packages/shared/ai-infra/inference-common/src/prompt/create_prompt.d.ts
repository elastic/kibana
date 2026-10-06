/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import type { PromptFactory } from './types';
export declare function createPrompt<TInput>(init: {
  name: string;
  description?: string;
  input: z.Schema<TInput>;
}): PromptFactory<TInput, []>;
