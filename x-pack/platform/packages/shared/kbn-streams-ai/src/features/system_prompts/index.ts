/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FeatureType } from '@kbn/streams-schema';
import infrastructureSystemPrompt from './infrastructure.text';
import technologySystemPrompt from './technology.text';

export const SYSTEM_PROMPTS: Record<FeatureType, string> = {
  infrastructure: infrastructureSystemPrompt,
  technology: technologySystemPrompt,
};
