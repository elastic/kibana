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
 * @param params.sampleCount - Number of samples available (for prompt context)
 * @param params.name - Name of the agent
 * @param params.description - Description of the agent (optional)
 * @param params.prompt - Prompt for the agent (optional)
 * @param params.tools - Tools for the agent (optional)
 * @returns Ingest pipeline generator agent configured with the provided parameters
 */
export const createIngestPipelineGeneratorAgent = (params: SubAgentParams): SubAgent => {
  let prompt = params.prompt || INGEST_PIPELINE_GENERATOR_PROMPT;

  if (params.sampleCount && params.sampleCount > 0) {
    prompt = `${prompt}

## Working with Log Samples

${params.sampleCount} log samples are available for this task. Use the following approach:

1. **Analyze Format**: Use the \`fetch_log_samples\` tool to retrieve a few samples (e.g., 3-5) to understand the log format and structure. Retrieve more if you find many differences in the log patterns.
2. **Design Pipeline**: Based on the sample analysis, create an appropriate Elasticsearch ingest pipeline.
3. **Validate**: Use the \`validate_ingest_pipeline\` tool to test your pipeline against all ${params.sampleCount} samples.
4. **Iterate**: If validation fails, analyze the errors, adjust the pipeline, and validate again.

Note: Samples are NOT in your context - you must use the fetch_log_samples tool to see them.`;
  }

  return {
    name: params.name,
    description:
      params.description ||
      'Generates an Elasticsearch ingest pipeline JSON for the provided log samples and documentation.',
    prompt,
    tools: params.tools,
  };
};
