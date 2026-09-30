/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultInferenceEndpoints } from '@kbn/inference-common';

export const NIGHTSHIFT_DEFAULT_MODELS = {
  discovery: defaultInferenceEndpoints.OPENAI_GPT_5_4,
  investigation: defaultInferenceEndpoints.ANTHROPIC_CLAUDE_4_6_SONNET,
  kiExtraction: defaultInferenceEndpoints.OPENAI_GPT_5_4,
  kiQueryGeneration: defaultInferenceEndpoints.ANTHROPIC_CLAUDE_4_6_SONNET,
} as const;

export type NightshiftModelStep = keyof typeof NIGHTSHIFT_DEFAULT_MODELS;
