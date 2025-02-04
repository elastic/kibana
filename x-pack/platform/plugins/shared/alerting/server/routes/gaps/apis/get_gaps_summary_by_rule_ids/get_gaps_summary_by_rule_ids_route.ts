/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IRouter } from '@kbn/core/server';
import {
  getGapsSummaryByRuleIdsBodySchemaV1,
  GetGapsSummaryByRuleIdsBodyV1,
  GetGapsSummaryByRuleIdsResponseV1,
} from '../../../../../common/routes/gaps/apis/get_gaps_summary_by_rule_ids';
import { ILicenseState } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import {
  AlertingRequestHandlerContext,
  INTERNAL_ALERTING_GAPS_GET_SUMMARY_BY_RULE_IDS_API_PATH,
} from '../../../../types';
import { transformRequestV1, transformResponseV1 } from './transforms';

export const getGapsSummaryByRuleIdsRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${INTERNAL_ALERTING_GAPS_GET_SUMMARY_BY_RULE_IDS_API_PATH}`,
      validate: {
        body: getGapsSummaryByRuleIdsBodySchemaV1,
      },
      options: {
        access: 'internal',
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const alertingContext = await context.alerting;
        const rulesClient = await alertingContext.getRulesClient();
        const body: GetGapsSummaryByRuleIdsBodyV1 = req.body;
        const result = await rulesClient.getGapsSummaryByRuleIds(transformRequestV1(body));
        const response: GetGapsSummaryByRuleIdsResponseV1 = {
          body: transformResponseV1(result),
        };
        return res.ok(response);
      })
    )
  );
};
