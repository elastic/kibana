/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import pRetry from 'p-retry';
import { OpenAIClient } from './create_openai_client';
import { type LoghubSystem } from './read_loghub_system_files';
import { getQueriesFilename, writeFileRecursively } from './utils';
import { queryFileSchema, validateQueries } from './validate_queries';

async function generateQueries({
  openAIClient,
  system,
  error,
  log,
}: {
  openAIClient: OpenAIClient;
  system: LoghubSystem;
  error?: Error;
  log: ToolingLog;
}): Promise<string> {
  log.info(`Attempting to generate queries for ${system.name}`);

  const systemPrompt = `You are an expert in Elasticsearch DSL, log patterns
      and log analytics.`;

  const reasoningResponse = await openAIClient.chat.completions.create({
    model: openAIClient.model,
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: `Given the following log message dataset and templates,
          generate queries using ES DSL. These queries should return log
          messages that are "interesting", such as startup/shutdown related
          messages, or warning/error/fatal messages. For each query,
          use a single \`match\` or \`regexp\` query. Keep the following
          things in mind:

          - Each query should return a single template. Do not group templates
          together.
          - Use the \`message\` field.
          - In the templates, \`<*>\` refers to a _variable_ in the actual log
          message. DO NOT include this in your query. Instead, just skip over
          the word in your match query, or group it as a variable in your
          regexp query.
          - The default operator for a \`match\` query is \`OR\`. Keep this in
          mind, most likely you'll want \`AND\`. Use capitalized letters.

            ${
              error
                ? `# Error
            The following error occurred on a previous attempt: ${error.message}`
                : ''
            }
          # Readme

          ${system.readme}

          # Templates

          ${system.templates.join('\n')}
            `,
      },
    ],
    temperature: 0.2,
  });

  const analysis = reasoningResponse.choices[0].message.content;

  log.verbose(`Analysis for ${system.name}:
    
    ${analysis}`);

  const output = await openAIClient.chat.completions.create({
    model: openAIClient.model,
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: `Based on previous reasoning, output the
        queries in a structured format.
        
        # Analysis
        ${analysis}`,
      },
    ],
    tools: [
      {
        function: {
          name: 'output',
          description:
            'Output the queries in structured data. Make sure you output the query DSL in `queries[n].query`',
          strict: true,
          parameters: {
            type: 'object',
            additionalProperties: false,
            properties: {
              queries: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    id: {
                      type: 'string',
                      description:
                        'The id of the query. Use [a-z_]+. Make sure the id is descriptive of the query, but keep it short.',
                    },
                    query: {
                      type: 'string',
                      description:
                        'The Elasticsearch Query DSL for the query, as serialized JSON. Wrap in { bool: { filter: [...] } }',
                    },
                    title: {
                      type: 'string',
                      description: 'A short title for the query',
                    },
                    description: {
                      type: 'string',
                      description: 'A human-readable description of what the query returns',
                    },
                  },
                  required: ['id', 'query', 'title', 'description'],
                },
              },
            },
            required: ['queries'],
          },
        },
        type: 'function',
      },
    ],
    tool_choice: {
      function: {
        name: 'output',
      },
      type: 'function',
    },
    temperature: 0.2,
  });

  const message = output.choices[0].message;

  const args = message.tool_calls?.[0]?.function.arguments;

  if (!args) {
    throw new Error(`Expected tool call, received message: ${message.content}`);
  }

  const queries = queryFileSchema.parse(JSON.parse(args));

  return JSON.stringify(queries, null, 2);
}

export async function ensureValidQueries({
  openAIClient,
  system,
  log,
}: {
  openAIClient: OpenAIClient;
  system: LoghubSystem;
  log: ToolingLog;
}) {
  let error: Error | undefined;

  const isValid = await validateQueries(system)
    .then(() => true)
    .catch(() => false);

  if (isValid) {
    return;
  }

  await pRetry(
    async () => {
      const file = await generateQueries({ system, error, log, openAIClient });

      await writeFileRecursively(getQueriesFilename(system), file);

      await validateQueries(system);
    },
    {
      retries: 5,
      onFailedAttempt(err) {
        log.debug(`Error generating queries for ${system.name}`);
        log.debug(err);
      },
    }
  );
}
