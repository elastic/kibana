/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlPrompts } from '../doc_base/load_data';

export const requestDocumentationSystemPrompt = ({ esqlPrompts }: { esqlPrompts: EsqlPrompts }) => {
  return `You are an assistant that helps with writing ESQL query for Elasticsearch.

Your current task is to examine the previous conversation, and to request documentation
from the ES|QL handbook to help you get the right information needed to generate a query.

Below are the ES|QL syntax and some examples from the official ES|QL documentation.

${esqlPrompts.syntax}

${esqlPrompts.examples}`;
};

export const generateEsqlPrompt = ({
  esqlPrompts,
  additionalSystemInstructions,
  availableTools,
  hasTools = false,
}: {
  esqlPrompts: EsqlPrompts;
  additionalSystemInstructions?: string;
  availableTools: string[];
  hasTools?: boolean;
}) => {
  const hasToolBlock = hasTools
    ? `**IMPORTANT**: If there is a tool suitable for answering the user's question, use that tool,
preferably with a natural language reply included. DO NOT attempt to call any other tools
that are not explicitly listed as available. Only use the following available tools: ${availableTools.join(
        ', '
      )}`
    : '**IMPORTANT**: There are no tools available to use. Do not attempt to call any tools.';

  return `You are an assistant that helps with writing ESQL query for Elasticsearch.
Given a natural language query, you will generate an ESQL query that can be executed against the data source.

# Current task

Your current task is to respond to the user's question.

${hasToolBlock}

## Documentation

${esqlPrompts.syntax}

${esqlPrompts.examples}

${esqlPrompts.instructions}

${
  additionalSystemInstructions
    ? `<additional_instructions>\n${additionalSystemInstructions}\n</<additional_instructions>`
    : ''
}

Take your time and think step by step about the natural language query and how to convert it into ESQL.

Format any ES|QL query as follows:
 \`\`\`esql
 <query>
 \`\`\`

${hasToolBlock}`;
};
