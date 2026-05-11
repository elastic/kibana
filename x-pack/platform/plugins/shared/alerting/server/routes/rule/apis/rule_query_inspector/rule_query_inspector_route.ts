/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, IRouter } from '@kbn/core/server';
import {
  ALERT_EVALUATION_TIME_RANGE,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_UUID,
  ALERT_UUID,
} from '@kbn/rule-data-utils';
import type { GetAlertIndicesAlias, ILicenseState } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import type { AlertingRequestHandlerContext, RuleTypeRegistry } from '../../../../types';
import { BASE_ALERTING_API_PATH } from '../../../../types';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../constants';
import type { RuleQueryInspectorTimeRange } from '../../../../rule_query_inspector/types';
import type { AlertingPluginsStart } from '../../../../plugin';
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
  ruleTypeRegistry: RuleTypeRegistry,
  getAlertIndicesAlias: GetAlertIndicesAlias,
  core: CoreSetup<AlertingPluginsStart, unknown>
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

        const ruleType = ruleTypeRegistry.get(rule.alertTypeId);
        const handler = ruleType.queryInspector;
        if (!handler) {
          return res.badRequest({
            body: {
              message: `Query inspection is not supported for rule type "${rule.alertTypeId}"`,
            },
          });
        }

        let ruleParams = rule.params as Record<string, unknown>;
        let timeRange: RuleQueryInspectorTimeRange | undefined;

        if (alertId) {
          const spaceId = rulesClient.getSpaceId();
          const alertIndex = getAlertIndicesAlias([rule.alertTypeId], spaceId).join(',');
          const [{ elasticsearch }] = await core.getStartServices();
          const esClient = elasticsearch.client.asScoped(req).asCurrentUser;

          const searchResult = await esClient.search({
            index: alertIndex,
            size: 1,
            query: { term: { [ALERT_UUID]: alertId } },
            _source: [ALERT_RULE_UUID, ALERT_RULE_PARAMETERS, ALERT_EVALUATION_TIME_RANGE],
          });

          const alertDoc = searchResult.hits.hits[0]?._source as
            | Record<string, unknown>
            | undefined;

          if (!alertDoc) {
            return res.notFound({
              body: {
                message: `Alert "${alertId}" not found`,
              },
            });
          }

          if (alertDoc[ALERT_RULE_UUID] !== ruleId) {
            return res.badRequest({
              body: {
                message: `Alert "${alertId}" does not belong to rule "${ruleId}"`,
              },
            });
          }

          const alertParams = alertDoc[ALERT_RULE_PARAMETERS] as
            | Record<string, unknown>
            | undefined;
          if (alertParams) {
            ruleParams = alertParams;
          }

          const evalTimeRange = alertDoc[ALERT_EVALUATION_TIME_RANGE] as
            | { gte: string; lte: string }
            | undefined;
          if (evalTimeRange) {
            timeRange = { gte: evalTimeRange.gte, lte: evalTimeRange.lte };
          }
        }

        const result = await handler(req, ruleParams, mode, timeRange);
        return res.ok({ body: result });
      })
    )
  );
};
