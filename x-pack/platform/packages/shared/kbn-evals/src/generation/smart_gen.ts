/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient, ToolSchema } from '@kbn/inference-common';
import type { Example, EvaluationDataset } from '../types';
import type { JSONSchema } from './schema_walker';

interface SmartGenConfig {
  count: number;
}

interface SmartGenOutput {
  gaps: Array<{ category: string; description: string }>;
  examples: Array<{ input: Record<string, unknown> }>;
}

const SYSTEM_PROMPT = `You are a test data generation expert. Your job is to analyze existing test datasets and a tool's JSON schema, identify coverage gaps, and generate new test examples that fill those gaps.

You will receive:
1. A tool's JSON Schema describing its input parameters
2. Existing test examples from the current dataset
3. A requested count of new examples to generate

Analyze the existing examples and identify:
- Missing edge cases (empty strings, zero values, very large inputs)
- Untested parameter combinations
- Boundary conditions not covered
- Error-prone input patterns not tested
- Missing enum variants or oneOf branches

Then generate exactly the requested number of new examples that fill these gaps.

Each example must be a valid JSON object matching the tool schema's input shape.
Return your analysis and generated examples as structured output.`;

const buildUserPrompt = (
  toolSchema: JSONSchema,
  existingExamples: Example[],
  count: number
): string => {
  const schemaStr = JSON.stringify(toolSchema, null, 2);
  const examplesStr = existingExamples
    .slice(0, 20)
    .map((ex, i) => `  ${i + 1}. ${JSON.stringify(ex.input)}`)
    .join('\n');

  return `## Tool Schema
\`\`\`json
${schemaStr}
\`\`\`

## Existing Examples (${existingExamples.length} total, showing first 20)
${examplesStr || '  (none)'}

## Request
Generate ${count} new test examples that fill coverage gaps in the existing dataset.`;
};

const outputSchema: ToolSchema = {
  type: 'object',
  properties: {
    gaps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['category', 'description'],
      },
    },
    examples: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          input: { type: 'object', properties: {} },
        },
        required: ['input'],
      },
    },
  },
  required: ['gaps', 'examples'],
};

/**
 * LLM-powered test generation.
 *
 * Analyzes an existing dataset against a tool schema, identifies coverage gaps
 * (missing edge cases, untested parameter combinations), and generates new
 * examples to fill them. Uses the inference client output API.
 */
export const generateSmartExamples = async (
  toolSchema: JSONSchema,
  existingDataset: EvaluationDataset,
  inferenceClient: BoundInferenceClient,
  config: SmartGenConfig
): Promise<Example[]> => {
  let parsed: SmartGenOutput;
  try {
    const response = await inferenceClient.output({
      id: 'smart_gen',
      system: SYSTEM_PROMPT,
      input: buildUserPrompt(toolSchema, existingDataset.examples, config.count),
      schema: outputSchema,
    });

    const output = response.output as unknown as SmartGenOutput;
    if (!Array.isArray(output?.gaps) || !Array.isArray(output?.examples)) {
      throw new Error('LLM returned unexpected output shape');
    }
    parsed = output;
  } catch (err) {
    throw new Error(`Smart generation failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  return parsed.examples.slice(0, config.count).map((ex: SmartGenOutput['examples'][number]) => ({
    input: ex.input,
    metadata: {
      generated_by: 'smart_gen',
      gaps_addressed: parsed.gaps.map((g: SmartGenOutput['gaps'][number]) => g.category),
    },
  }));
};
