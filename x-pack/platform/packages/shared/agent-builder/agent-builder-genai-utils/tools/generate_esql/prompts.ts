/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessageLike } from '@langchain/core/messages';
import type { EsqlPrompts } from '@kbn/inference-plugin/server/tasks/nl_to_esql/doc_base/load_data';
import type { ResolvedResourceWithSampling } from '../utils/resources';
import { formatResourceWithSampledValues } from '../utils/resources';
import type { Action } from './actions';
import { formatAction } from './actions';
import { getEsqlInstructions } from './prompts/instructions_template';

export const createRequestDocumentationPrompt = ({
  nlQuery,
  resource,
  prompts,
}: {
  nlQuery: string;
  resource: ResolvedResourceWithSampling;
  prompts: EsqlPrompts;
}): BaseMessageLike[] => {
  return [
    [
      'system',
      `You are an Elasticsearch assistant that helps with writing ES|QL queries.

Your current task is to examine the information provided by the user, and to request documentation
from the ES|QL handbook to help you get the right information needed to generate a query.
That documentation will be used in a later step to actually generate the query.

## Documentation

Below are the ES|QL syntax and some examples from the official ES|QL documentation.

<syntax-overview>
${prompts.syntax}
</syntax-overview>

<esql-examples>
${prompts.examples}
</esql-examples>`,
    ],
    [
      'user',
      `Your task is to write a single, valid ES|QL query based on the following information:

<user-query>
${nlQuery}
</user-query>

${formatResourceWithSampledValues({ resource })}

Now, based on that information, request documentation from the ES|QL handbook to help you get the right information needed to generate a query.`,
    ],
  ];
};

export const createGenerateEsqlPrompt = ({
  nlQuery,
  resource,
  previousActions,
  prompts,
  additionalInstructions,
  additionalContext,
  rowLimit,
  disableNamedParams,
}: {
  nlQuery: string;
  resource: ResolvedResourceWithSampling;
  prompts: EsqlPrompts;
  previousActions: Action[];
  additionalInstructions?: string;
  additionalContext?: string;
  rowLimit?: number;
  disableNamedParams?: boolean;
}): BaseMessageLike[] => {
  return [
    [
      'system',
      `You are an Elasticsearch assistant that helps with writing ES|QL queries.
Given a natural language query, you will generate an ES|QL query that can be executed against the data source.

# Current task

Your current task is to respond to the user's question by providing a valid ES|QL query.

Please use the information accessible from your past actions when relevant.

## Documentation

<syntax-overview>
${prompts.syntax}
</syntax-overview>

<esql-examples>
${prompts.examples}
</esql-examples>

## Instructions

${getEsqlInstructions({ defaultLimit: rowLimit, disableNamedParams })}

${
  additionalInstructions
    ? `<user-instructions>\n${additionalInstructions}\n</user-instructions>

*Note: When conflicting, user instructions should take precedence over the default instructions.*`
    : ''
}

Take your time and think step by step about the natural language query and how to convert it into ES|QL.

Format any ES|QL query as follows:
 \`\`\`esql
 <query>
 \`\`\`
`,
    ],
    [
      'user',
      `Your task is to write a single, valid ES|QL query based on the following information:

## Context

<user-query>
${nlQuery}
</user-query>

${additionalContext ? `<additional-context>\n${additionalContext}\n</additional-context>` : ''}

${formatResourceWithSampledValues({ resource })}

Now, based on that information, please generate the ES|QL query.`,
    ],
    ...previousActions.flatMap((a) => formatAction(a)),
  ];
};
