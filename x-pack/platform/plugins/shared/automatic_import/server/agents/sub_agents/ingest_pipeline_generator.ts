/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SubAgent, SubAgentParams } from '../types';
import { INGEST_PIPELINE_GENERATOR_PROMPT } from '../prompts';

/**
 * Creates an ingest pipeline generator agent.
 * Uses a tool-based approach for maximum token efficiency:
 * - Agent can fetch samples on demand using fetch_log_samples tool
 * - Validator tool has access to all samples for comprehensive testing
 * - No samples in context unless agent explicitly requests them
 *
 * @param params - SubAgent parameters
 * @param params.name - Name of the agent
 * @param params.description - Description of the agent (optional)
 * @param params.prompt - Prompt for the agent (optional)
 * @param params.tools - Tools for the agent (optional)
 * @returns Ingest pipeline generator agent configured with the provided parameters
 */
export const createIngestPipelineGeneratorAgent = (params: SubAgentParams): SubAgent => {
  return {
    name: params.name,
    description:
      params.description ||
      'Generates an Elasticsearch ingest pipeline JSON for the provided log samples and documentation.',
    prompt: params.prompt || INGEST_PIPELINE_GENERATOR_PROMPT,
    tools: params.tools,
  };
};
