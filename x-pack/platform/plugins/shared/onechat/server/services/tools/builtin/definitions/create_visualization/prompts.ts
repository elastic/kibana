/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessageLike } from '@langchain/core/messages';
import type { JsonSchema, SupportedChartType } from './types';

export const createGenerateConfigPrompt = ({
  nlQuery,
  chartType,
  schema,
  existingConfig,
  additionalInstructions,
  additionalContext,
}: {
  nlQuery: string;
  chartType: SupportedChartType;
  schema: JsonSchema;
  existingConfig?: string;
  additionalInstructions?: string;
  additionalContext?: string;
}): BaseMessageLike[] => {
  return [
    [
      'system',
      `You are a Kibana Lens visualization configuration expert. Generate a valid configuration for a ${chartType} visualization based on the provided schema and ES|QL query.

Schema for ${chartType}:
${JSON.stringify(schema, null, 2)}

${existingConfig ? `Existing configuration to modify: ${existingConfig}` : ''}

${additionalInstructions}

Your task is to generate a ${chartType} visualization configuration based on the following information:

<user_query>
${nlQuery}
</user_query>

Generate the ${chartType} visualization configuration.

${additionalContext}`,
    ],
  ];
};
