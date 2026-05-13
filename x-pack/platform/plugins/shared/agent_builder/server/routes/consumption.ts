/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import path from 'node:path';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import { publicApiPath } from '../../common/constants';
import { AGENTS_WRITE_SECURITY } from './route_security';
import type { ConsumptionResponse } from '../../common/http_api/consumption';

/**
 * Registers POST /api/agent_builder/agents/{agent_id}/consumption
 *
 * Public, Tech Preview route. Requires the manageAgents privilege.
 * Returns paginated, per-conversation token consumption data across all users
 * for a given agent. Uses search_after cursor pagination and Painless scripted
 * fields to aggregate token usage.
 *
 * Changed from the internal GET route to a public versioned POST so that
 * structured params (search_after array, usernames array) are passed in the
 * request body instead of encoded query strings.
 */
export function registerConsumptionRoutes({
  router,
  getInternalServices,
  logger,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  router.versioned
    .post({
      path: `${publicApiPath}/agents/{agent_id}/consumption`,
      security: AGENTS_WRITE_SECURITY,
      access: 'public',
      summary: 'Get agent consumption data',
      description:
        'Returns paginated, per-conversation token consumption data for a given agent. ' +
        'Includes input/output token counts, round counts, LLM call counts, and warnings ' +
        'for conversations with high token usage. Requires the manageAgents privilege. ' +
        'To learn more about monitoring agent token usage, refer to the [monitor usage documentation](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/monitor-usage).',
      options: {
        tags: ['consumption', 'oas-tag:agent builder'],
        availability: {
          stability: 'experimental',
          since: '9.4.0',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            params: schema.object({
              agent_id: schema.string({
                meta: { description: 'The unique identifier of the agent.' },
              }),
            }),
            body: schema.object({
              size: schema.number({
                defaultValue: 25,
                min: 1,
                max: 100,
                meta: { description: 'Number of results per page.' },
              }),
              sort_field: schema.oneOf(
                [
                  schema.literal('updated_at'),
                  schema.literal('total_tokens'),
                  schema.literal('round_count'),
                ],
                {
                  defaultValue: 'updated_at',
                  meta: { description: 'Field to sort results by.' },
                }
              ),
              sort_order: schema.oneOf([schema.literal('asc'), schema.literal('desc')], {
                defaultValue: 'desc',
                meta: { description: 'Sort direction.' },
              }),
              search_after: schema.maybe(
                schema.arrayOf(schema.any(), {
                  meta: {
                    description:
                      'Cursor for pagination. Pass the search_after value from the previous response.',
                  },
                  maxSize: 10000,
                })
              ),
              search: schema.maybe(
                schema.string({
                  meta: { description: 'Free-text search filter on conversation title.' },
                })
              ),
              usernames: schema.maybe(
                schema.arrayOf(schema.string(), {
                  meta: { description: 'Filter results to conversations by these usernames.' },
                  maxSize: 10000,
                })
              ),
              has_warnings: schema.maybe(
                schema.boolean({
                  meta: {
                    description: 'Filter to conversations with or without high-token warnings.',
                  },
                })
              ),
            }),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/consumption_get.yaml'),
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { consumption } = getInternalServices();
        const client = consumption.getScopedClient({ request });
        const body = await client.getConsumption();

        return response.ok<ConsumptionResponse>({ body });
      })
    );
}
