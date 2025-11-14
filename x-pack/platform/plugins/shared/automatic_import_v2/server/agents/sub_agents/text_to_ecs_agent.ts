/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SubAgent } from '../types';
import { TEXT_TO_ECS_PROMPT } from '../prompts';

/**
 * Creates a text-to-ECS mapping agent.
 * This agent maps user-provided field names and data to their correct ECS field equivalents.
 *
 * @param params - SubAgent parameters
 * @param params.name - Name of the agent
 * @param params.description - Description of the agent (optional)
 * @param params.prompt - Prompt for the agent (optional, defaults to TEXT_TO_ECS_PROMPT)
 * @param params.tools - Tools for the agent (optional)
 * @returns Text-to-ECS mapping agent configured with the provided parameters
 */
const createTextToEcsAgent = (): SubAgent => {
  return {
    name: 'text_to_ecs',
    description:
      'Maps user-provided field names and data to their correct ECS (Elastic Common Schema) field equivalents.',
    prompt: TEXT_TO_ECS_PROMPT,
    tools: [],
  };
};

export const textToEcsSubAgent = createTextToEcsAgent();
