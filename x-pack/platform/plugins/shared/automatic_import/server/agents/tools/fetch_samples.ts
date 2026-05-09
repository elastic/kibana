/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from '@kbn/zod/v4';

/**
 * Creates a tool that allows the agent to fetch log samples on demand.
 * The agent can request a specific number of samples to analyze format and structure.
 * Samples are only loaded into context when the agent explicitly calls this tool.
 *
 * @param samples - Array of all available samples
 * @returns DynamicStructuredTool that returns requested samples
 */
export function fetchSamplesTool(samples: string[]): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'fetch_log_samples',
    description:
      'Retrieves additional log samples beyond those already provided in your context. ' +
      'Use this ONLY when the provided samples are not sufficient to fully describe the format ' +
      '(e.g., you suspect structural variants not represented, or need to verify edge cases). ' +
      'Try to complete your analysis with the provided samples first. ' +
      `Currently ${samples.length} total samples are available (default: 3, max: 20 recommended).`,
    schema: z.object({
      count: z
        .number()
        .min(1)
        .max(samples.length)
        .optional()
        .describe('Number of samples to retrieve (default: 3)'),
      offset: z
        .number()
        .min(0)
        .optional()
        .describe('Starting index for samples (default: 0, useful for pagination)'),
    }),
    func: async (input) => {
      const { count = 3, offset = 0 } = input;

      // Validate offset
      if (offset >= samples.length) {
        return JSON.stringify({
          error: `Offset ${offset} exceeds available samples (${samples.length} total)`,
          total_available: samples.length,
        });
      }

      const endIndex = Math.min(offset + count, samples.length);
      const requestedSamples = samples.slice(offset, endIndex);

      const sampleBlocks = requestedSamples
        .map((s, i) => `[Sample ${offset + i + 1}]\n${s}`)
        .join('\n\n');

      return (
        `Returned ${requestedSamples.length} of ${samples.length} samples (offset: ${offset})` +
        `${endIndex < samples.length ? ` — more available` : ''}\n\n${sampleBlocks}`
      );
    },
  });
}
