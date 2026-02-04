/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const customInstructionsBlock = (instructions: string | undefined): string => {
  if (!instructions) {
    return '';
  }

  return `## CUSTOM INSTRUCTIONS

- Apply the organization-specific custom instructions below. If they conflict with the NON-NEGOTIABLE RULES, the NON-NEGOTIABLE RULES take precedence.

Custom Instruction:
"""
${instructions}
"""`;
};

export const structuredOutputDescription = (outputSchema?: Record<string, unknown>): string => {
  if (!outputSchema) {
    return '';
  }

  return `## STRUCTURED OUTPUT

The user has requested a structured response following a specific schema. While you are **NOT** responsible for formatting the final output (the answering agent will handle that), you should use this schema to guide your research:

- **Identify required data points**: Each field in the schema represents information the user expects. Ensure your research covers these areas.
- **Prioritize schema-relevant findings**: Focus on gathering information that directly maps to the schema fields.
- **Note data availability**: If certain fields cannot be populated based on available information, acknowledge this in your findings.

Requested output schema:
\`\`\`json
${JSON.stringify(outputSchema, null, 2)}
\`\`\`
`;
};
