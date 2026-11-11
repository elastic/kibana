/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultInferenceEndpoints } from '@kbn/inference-common';

export const NIGHTSHIFT_DEFAULT_MODELS = {
  discovery: defaultInferenceEndpoints.OPENAI_GPT_6_LUNA,
  investigation: defaultInferenceEndpoints.ANTHROPIC_CLAUDE_5_5_SONNET,
  kiExtraction: defaultInferenceEndpoints.OPENAI_GPT_6_LUNA_PRO,
  kiQueryGeneration: defaultInferenceEndpoints.OPENAI_GPT_6_LUNA_PRO,
  // Every online eval judge uses this one model, from a different provider than the investigation,
  // so an investigation is never graded by the model that ran it.
  onlineEvalsJudge: defaultInferenceEndpoints.OPENAI_GPT_6_SOL,
} as const;

export type NightshiftModelStep = keyof typeof NIGHTSHIFT_DEFAULT_MODELS;
