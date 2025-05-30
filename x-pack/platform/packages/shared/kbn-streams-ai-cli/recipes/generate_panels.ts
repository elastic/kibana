/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { runRecipe } from '@kbn/inference-cli';
import { Streams } from '@kbn/streams-schema';
import moment from 'moment';
import { format } from 'util';
import { answerAsEsqlExpert, generateMappings, generatePanels } from '@kbn/streams-ai';
import { omit } from 'lodash';

runRecipe(
  {
    name: 'generate_panels',
    flags: {
      string: ['stream'],
      help: `
        --stream      The name of the stream to generate panels for
      `,
      default: {
        stream: 'logs',
      },
    },
  },
  async ({ inferenceClient, kibanaClient, flags, esClient, logger, log, signal }) => {
    const getResponse = await kibanaClient.fetch<Streams.WiredStream.GetResponse>(
      `/api/streams/${flags.stream}`
    );

    const definition = getResponse.stream;

    const now = moment();

    const end = now.valueOf();

    const start = now.clone().subtract(1, 'days').valueOf();

    const panels = await generatePanels({
      definition,
      end,
      esClient,
      inferenceClient,
      logger,
      signal,
      start,
    });

    const fields = await generateMappings({
      definition,
      end,
      esClient,
      inferenceClient,
      logger,
      signal,
      start,
      suggestedQueries: panels.map((panel) => panel.query),
    });

    await kibanaClient.fetch(`/api/streams/${flags.stream}`, {
      method: 'PUT',
      body: {
        dashboards: getResponse.dashboards,
        queries: getResponse.queries,
        stream: {
          ...omit(definition, 'name'),
          ingest: {
            ...definition.ingest,
            wired: {
              ...definition.ingest.wired,
              fields: {
                ...definition.ingest.wired.fields,
                ...Object.fromEntries(
                  fields.map(({ name, ...rest }) => {
                    return [name, rest];
                  })
                ),
              },
            },
          },
        },
      } satisfies Streams.WiredStream.UpsertRequest,
    });

    const queries = await answerAsEsqlExpert({
      end,
      esClient,
      inferenceClient,
      logger,
      signal,
      start,
      prompt: `Generate ES|QL queries for the following panels. If a query
        cannot be generated, specify the error using "error". Use \`generate_panels\`
        to complete the result.

        \`index\`:
        ${definition.name}
        
        \`panels\`:
        \`\`\`json
        ${JSON.stringify(panels)}
        \`\`\`
      `,
      tools: {
        generate_panels: {
          description: 'Generate panels',
          schema: {
            type: 'object',
            properties: {
              panels: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: {
                      type: 'string',
                    },
                    query: {
                      type: 'string',
                    },
                    error: {
                      type: 'string',
                    },
                  },
                  required: ['id'],
                },
              },
            },
          },
        },
      } as const,
      toolCallbacks: {
        generate_panels: async (toolCall) => {
          return {};
        },
      },
    });

    log.info(
      format({
        panels,
        fields,
        queries,
      })
    );
  }
);
