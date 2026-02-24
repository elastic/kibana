/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SubAgent, SubAgentParams } from '../types';
import { TEXT_TO_ECS_PROMPT } from '../prompts';

export interface CreateTextToEcsAgentParams
  extends Omit<SubAgentParams, 'name' | 'description' | 'sampleCount'> {
  /** When set, used as the full system prompt (e.g. for GEPA evaluation overrides). */
  systemPromptOverride?: string;
}

/**
 * Creates a text-to-ECS mapping agent.
 * This agent maps user-provided field names and data to their correct ECS field equivalents.
 *
 * @param params - SubAgent parameters (tools and optional extra prompt)
 * @returns Text-to-ECS mapping agent configured with the provided parameters.
 */
export const createTextToEcsAgent = (params: CreateTextToEcsAgentParams): SubAgent => {
  const { prompt: userPrompt, systemPromptOverride } = params;
  const prompt =
    systemPromptOverride !== undefined
      ? systemPromptOverride
      : TEXT_TO_ECS_PROMPT + (userPrompt ? `\n\n${userPrompt}` : '');
  return {
    name: 'text_to_ecs',
    description:
      'Maps user-provided field names and data to their correct ECS (Elastic Common Schema) field equivalents.',
    prompt,
    tools: params.tools,
  };
};
