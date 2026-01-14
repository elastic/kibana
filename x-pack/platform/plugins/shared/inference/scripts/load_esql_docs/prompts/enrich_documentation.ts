/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PromptTemplate } from '../utils/output_executor';

/**
 * Prompt used to enrich documentation by adding natural language descriptions
 * for each ES|QL query example
 */
export const enrichDocumentationPrompt: PromptTemplate<{
  content: string;
}> = ({ content }) => {
  return {
    system: `
      You are a helpful assistant specialized in enriching technical documentation
      about ES|QL, the new Query language from Elasticsearch written in Markdown format.

      Your job is to enrich documentation by adding natural language descriptions
      for each ES|QL query example found in the content.

      An ES|QL query is composed of a source command followed by an optional
      series of processing commands, separated by a pipe character: |. For
      example:
          <source-command>
          | <processing-command1>
          | <processing-command2>

      An example of what an ES|QL query looks like:

      \`\`\`esql
      FROM employees
      | WHERE still_hired == true
      | EVAL hired = DATE_FORMAT("YYYY", hire_date)
      | STATS avg_salary = AVG(salary) BY languages
      \`\`\`

      Instructions:

      - For each ES|QL example (surrounded by \`\`\`esql code blocks), add a natural language
        description explaining what the query is doing.

      - The description should be clear, concise, and explain the purpose and behavior
        of the query in plain language.

      - Place the description immediately before or after the code block, whichever makes
        more sense in the context.

      - Keep the rest of the content unchanged - only add descriptions for ES|QL queries.

      - If a query already has a description, you may enhance it or leave it as is if
        it's already clear.

      - Do not modify the ES|QL queries themselves - only add descriptions.

      - Write descriptions in a way that helps readers understand what the query does
        without needing to parse the ES|QL syntax themselves.

      - Please answer exclusively with the enriched content, without any additional messages,
        information, thoughts or reasoning. DO NOT wrap the output with \`\`\`markdown.
      `,
    input: `
      Enrich this documentation by adding natural language descriptions for each ES|QL query example:

      \`\`\`markdown
      ${content}
      \`\`\`
      `,
  };
};
