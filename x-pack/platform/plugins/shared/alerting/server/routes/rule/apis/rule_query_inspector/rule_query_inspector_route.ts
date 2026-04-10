/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type { ILicenseState } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../types';
import { BASE_ALERTING_API_PATH } from '../../../../types';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../constants';
import type { RuleQueryInspectorRegistry } from '../../../../rule_query_inspector/registry';

const paramSchema = schema.object({
  id: schema.string({
    meta: { description: 'The identifier for the rule.' },
  }),
});

const querySchema = schema.object({
  mode: schema.oneOf([schema.literal('build'), schema.literal('execute')], {
    defaultValue: 'build',
    meta: {
      description:
        'The inspection mode. Use "build" to return only the query, or "execute" to run the query and include the response.',
    },
  }),
  start: schema.maybe(
    schema.string({
      meta: {
        description:
          'The start of the time range. When provided with end, the inspector uses this range instead of the current time.',
      },
    })
  ),
  end: schema.maybe(
    schema.string({
      meta: {
        description:
          'The end of the time range. When provided with start, the inspector uses this range instead of the current time.',
      },
    })
  ),
});

const queryResultSchema = schema.object({
  index: schema.string(),
  request: schema.recordOf(schema.string(), schema.any()),
  response: schema.maybe(schema.recordOf(schema.string(), schema.any())),
  label: schema.maybe(schema.string()),
});

const responseBodySchema = schema.object({
  queries: schema.arrayOf(queryResultSchema),
});

export const ruleQueryInspectorRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState,
  ruleQueryInspectorRegistry: RuleQueryInspectorRegistry
) => {
  router.get(
    {
      path: `${BASE_ALERTING_API_PATH}/rule/{id}/query_inspector`,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options: {
        access: 'public',
        summary: 'Get the Elasticsearch query for a rule',
        description:
          'Returns the Elasticsearch query that a rule executes, and optionally its response.',
        tags: ['oas-tag:alerting'],
      },
      validate: {
        request: {
          params: paramSchema,
          query: querySchema,
        },
        response: {
          200: {
            body: () => responseBodySchema,
            description: 'Indicates a successful call.',
          },
          400: {
            description:
              'Indicates the rule type is not supported or the request parameters are invalid.',
          },
          404: {
            description: 'Indicates a rule with the given ID does not exist.',
          },
        },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const alertingContext = await context.alerting;
        const rulesClient = await alertingContext.getRulesClient();
        const { id: ruleId } = req.params;
        const { mode } = req.query;

        const rule = await rulesClient.get({ id: ruleId });

        const handler = ruleQueryInspectorRegistry.get(rule.alertTypeId);
        if (!handler) {
          return res.badRequest({
            body: {
              message: `Query inspection is not supported for rule type "${rule.alertTypeId}"`,
              attributes: {
                supportedRuleTypes: ruleQueryInspectorRegistry.getSupportedRuleTypes(),
              },
            },
          });
        }

        const { start, end } = req.query;
        if ((start && !end) || (!start && end)) {
          return res.badRequest({
            body: { message: 'Both "start" and "end" must be provided together, or both omitted.' },
          });
        }
        const timeRange = start && end ? { gte: start, lte: end } : undefined;

        const result = await handler(req, rule.params as Record<string, unknown>, mode, timeRange);
        return res.ok({ body: result });
      })
    )
  );
};
