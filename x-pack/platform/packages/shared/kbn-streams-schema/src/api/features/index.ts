/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatCompletionTokenCount } from '@kbn/inference-common';
import type { BaseFeature } from '../../feature';

export interface IterationResult {
  iteration: number;
  durationMs: number;
  state: 'success' | 'failure';
  tokensUsed: ChatCompletionTokenCount;
  newFeatures: Array<{ id: string; title: string }>;
  updatedFeatures: Array<{ id: string; title: string }>;
}

export interface IdentifyFeaturesResult {
  features: BaseFeature[];
  durationMs: number;
  iterations?: IterationResult[];
  totalTokensUsed?: ChatCompletionTokenCount;
}
