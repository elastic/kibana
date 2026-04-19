/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { isRoundCompleteEvent } from '@kbn/agent-builder-common';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { firstValueFrom, toArray } from 'rxjs';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import { publicApiPath } from '../../common/constants';
import { AGENT_BUILDER_WRITE_SECURITY } from './route_security';
import { processRuleTemplateVariables } from '../services/rules';

export function registerSmlRuleRoutes({ router, logger, getInternalServices }: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  router.versioned
    .post({
      path: `${publicApiPath}/sml/rule/resolve`,
      security: AGENT_BUILDER_WRITE_SECURITY,
      access: 'public',
      summary: 'Resolve SML rule template variables',
      description: 'Resolve template variables for an SML rule prompt.',
      options: {
        xsrfRequired: false,
        tags: ['sml', 'oas-tag:agent builder'],
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
            body: schema.object({
              name: schema.string(),
              type: schema.string(),
              type_parameters: schema.maybe(schema.recordOf(schema.string(), schema.string())),
              prompt: schema.string(),
              agent_name: schema.string(),
              variables: schema.maybe(
                schema.recordOf(
                  schema.string(),
                  schema.object({
                    type: schema.string(),
                    input: schema.string(),
                    params: schema.maybe(schema.recordOf(schema.string(), schema.any())),
                  })
                )
              ),
            }),
          },
        },
      },
      wrapHandler(
        async (ctx, request, response) => {
          const { prompt, type_parameters, variables } = request.body;
          const esClient = (await ctx.core).elasticsearch.client.asCurrentUser;

          const resolvedPrompt = await processRuleTemplateVariables(
            prompt,
            type_parameters ?? {},
            variables ?? {},
            esClient
          );

          return response.ok({ body: resolvedPrompt });
        },
        {
          featureFlag: AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID,
        }
      )
    );

  router.versioned
    .post({
      path: `${publicApiPath}/sml/rule/apply`,
      security: AGENT_BUILDER_WRITE_SECURITY,
      access: 'public',
      summary: 'Apply an SML rule prompt',
      description: 'Apply an SML rule prompt.',
      options: {
        xsrfRequired: false,
        tags: ['sml', 'oas-tag:agent builder'],
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
            body: schema.object({
              prompt: schema.string(),
              name: schema.string(),
              agent_name: schema.string(),
            }),
          },
        },
      },
      wrapHandler(
        async (ctx, request, response) => {
          const { prompt, agent_name: agentName } = request.body;
          const { execution } = getInternalServices();

          const { events$ } = await execution.executeAgent({
            request,
            params: {
              agentId: agentName,
              nextInput: {
                message: prompt,
              },
            },
          });

          const events = await firstValueFrom(events$.pipe(toArray()));
          const roundCompleteEvent = events.find(isRoundCompleteEvent);

          if (!roundCompleteEvent) {
            throw new Error('No complete response received from execution service');
          }

          let message = {
            "response": roundCompleteEvent.data.round.response.message,
            "model_usage:": roundCompleteEvent.data.round.model_usage,
          }

          return response.ok({ body: JSON.stringify(message) });
        },
        {
          featureFlag: AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID,
        }
      )
    );
}
