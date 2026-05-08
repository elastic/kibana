/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { platformCoreTools } from '@kbn/agent-builder-common';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import { AGENT_BUILDER_READ_SECURITY } from './route_security';
import { AGENT_SOCKET_TIMEOUT_MS } from './utils';

export function registerGenerateEsqlRoute({
  router,
  getInternalServices,
  logger,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  router.versioned
    .post({
      path: '/api/genie/generate_esql',
      security: AGENT_BUILDER_READ_SECURITY,
      access: 'public',
      summary: 'Generate an ES|QL query from natural language',
      description:
        'Generate (and optionally validate or execute) an ES|QL query from a natural language query. Wraps the platform.core.generate_esql agent-builder tool.',
      options: {
        timeout: {
          idleSocket: AGENT_SOCKET_TIMEOUT_MS,
        },
        tags: ['tools', 'oas-tag:agent builder'],
        availability: {
          since: '9.2.0',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            body: schema.object({
              query: schema.string({
                meta: { description: 'A natural language query to generate an ES|QL query from.' },
              }),
              index: schema.maybe(
                schema.string({
                  meta: {
                    description:
                      'Index or index-pattern to search against. If not provided, will automatically select the best index to use based on the query.',
                  },
                })
              ),
              context: schema.maybe(
                schema.string({
                  meta: {
                    description:
                      'Additional context that could be useful to generate the ES|QL query.',
                  },
                })
              ),
              execute_query: schema.boolean({
                defaultValue: true,
                meta: {
                  description:
                    'If false, only validate the query using AST. If true (default), will execute the query to ensure it is valid before returning it.',
                },
              }),
              disable_named_params: schema.boolean({
                defaultValue: false,
                meta: {
                  description:
                    'If true, disables the instruction to use named parameters (?_tstart, ?_tend) for time range filtering.',
                },
              }),
              time_range: schema.maybe(
                schema.object(
                  {
                    from: schema.string({
                      meta: {
                        description:
                          'Start of the time range in Elasticsearch-compatible date format - Date Math or ISO 8601, e.g. "now-24h" or "2026-01-01T00:00:00Z".',
                      },
                    }),
                    to: schema.string({
                      meta: {
                        description:
                          'End of the time range in Elasticsearch-compatible date format - Date Math or ISO 8601, e.g. "now" or "2026-01-31T23:59:59Z".',
                      },
                    }),
                  },
                  {
                    meta: {
                      description:
                        'Time range to use for named parameters ?_tstart and ?_tend when validating the generated query. If not provided, falls back to the time range from the screen context.',
                    },
                  }
                )
              )
            }),
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { ...toolParams } = request.body;
        const { tools: toolService } = getInternalServices();
        const registry = await toolService.getRegistry({ request });

        const toolResult = await registry.execute({
          toolId: platformCoreTools.generateEsql,
          toolParams,
          source: 'user'
        });

        const esqlResults = toolResult.results?.find(
          (result) => result.type === "query"
        );;

        if (!esqlResults) {
          return response.ok({ body: { error: 'No ES|QL results found' } });
        }

        return response.ok({
          body: {
            ...esqlResults?.data
          },
        });
      })
    );
}
