/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { ILicenseState } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../types';
import { BASE_ALERTING_API_PATH } from '../../../../types';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../constants';
import type { RuleQueryInspectorRegistry } from '../../../../rule_query_inspector/registry';
import type {
  RuleQueryInspectorRequestParamsV1,
  RuleQueryInspectorRequestQueryV1,
} from '../../../../../common/routes/rule/apis/rule_query_inspector';
import {
  ruleQueryInspectorParamsSchemaV1,
  ruleQueryInspectorQuerySchemaV1,
  ruleQueryInspectorResponseSchemaV1,
  ruleQueryInspectorExamplesV1,
} from '../../../../../common/routes/rule/apis/rule_query_inspector';

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
        oasOperationObject: ruleQueryInspectorExamplesV1,
      },
      validate: {
        request: {
          params: ruleQueryInspectorParamsSchemaV1,
          query: ruleQueryInspectorQuerySchemaV1,
        },
        response: {
          200: {
            body: () => ruleQueryInspectorResponseSchemaV1,
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
        const { id: ruleId }: RuleQueryInspectorRequestParamsV1 = req.params;
        const { mode, alert_id: alertId }: RuleQueryInspectorRequestQueryV1 = req.query;

        const rule = await rulesClient.get({ id: ruleId });

        const handler = ruleQueryInspectorRegistry.get(rule.alertTypeId);
        if (!handler) {
          return res.badRequest({
            body: {
              message: `Query inspection is not supported for rule type "${rule.alertTypeId}"`,
            },
          });
        }

        const result = await handler(
          req,
          ruleId,
          rule.params as Record<string, unknown>,
          mode,
          alertId
        );
        return res.ok({ body: result });
      })
    )
  );
};
