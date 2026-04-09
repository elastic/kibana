/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SubAgent, SubAgentParams } from '../types';
import { REVIEW_AGENT_PROMPT } from '../prompts';

/**
 * Creates a review agent that inspects the final pipeline for quality,
 * completeness, and ECS compliance. Returns SUCCESS or actionable feedback.
 *
 * @param params - SubAgent parameters (tools and optional extra prompt)
 * @returns Review agent configured with the provided parameters
 */
export const createReviewAgent = (
  params: Omit<SubAgentParams, 'name' | 'description' | 'sampleCount'>
): SubAgent => {
  const userPrompt = params.prompt;
  return {
    name: 'review_agent',
    description: 'Reviews the final pipeline for quality, completeness, and ECS compliance.',
    prompt: REVIEW_AGENT_PROMPT + (userPrompt ? `\n\n${userPrompt}` : ''),
    tools: params.tools,
  };
};
