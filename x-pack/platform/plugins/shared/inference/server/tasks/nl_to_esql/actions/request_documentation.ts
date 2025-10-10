/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ToolOptions,
  Message,
  ChatCompleteMetadata,
  ChatCompleteOptions,
  OutputAPI,
} from '@kbn/inference-common';
import { withoutOutputUpdateEvents } from '@kbn/inference-common';
import type { EsqlPrompts } from '../doc_base/load_data';
import { requestDocumentationSystemPrompt } from './prompts';

import { requestDocumentationSchema } from './shared';

export const requestDocumentation = ({
  outputApi,
  esqlPrompts,
  messages,
  connectorId,
  functionCalling,
  maxRetries,
  retryConfiguration,
  metadata,
  toolOptions,
}: {
  outputApi: OutputAPI;
  messages: Message[];
  esqlPrompts: EsqlPrompts;
  connectorId: string;
  metadata?: ChatCompleteMetadata;
  toolOptions: ToolOptions;
} & Pick<ChatCompleteOptions, 'maxRetries' | 'retryConfiguration' | 'functionCalling'>) => {
  return outputApi({
    id: 'request_documentation',
    connectorId,
    stream: true,
    functionCalling,
    maxRetries,
    retryConfiguration,
    metadata,
    system: requestDocumentationSystemPrompt({ esqlPrompts }),
    previousMessages: messages,
    input: `Now, based on the previous conversation, request documentation
        from the ES|QL handbook to help you get the right information
        needed to generate a query.

        Examples for functions and commands:
        - Do you need to group data? Request \`STATS\`.
        - Extract data? Request \`DISSECT\` AND \`GROK\`.
        - Convert a column based on a set of conditionals? Request \`EVAL\` and \`CASE\`.
`,
    schema: requestDocumentationSchema,
  }).pipe(withoutOutputUpdateEvents());
};
