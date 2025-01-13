/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IRouter } from '@kbn/core/server';
import {
  getGapsInfoByRuleIdsQuerySchemaV1,
  GetGapsInfoByRuleIdsQueryV1,
  GetGapsInfoByRuleIdsResponseV1,
} from '../../../../../common/routes/gaps/apis/get_gaps_info_by_rule_ids';
import { ILicenseState } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import {
  AlertingRequestHandlerContext,
  INTERNAL_ALERTING_GAPS_GET_INFO_BY_RULE_IDS_API_PATH,
} from '../../../../types';
import { transformRequestV1, transformResponseV1 } from './transforms';

export const getGapsInfoByRuleIdsRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${INTERNAL_ALERTING_GAPS_GET_INFO_BY_RULE_IDS_API_PATH}`,
      validate: {
        body: getGapsInfoByRuleIdsQuerySchemaV1,
      },
      options: {
        access: 'internal',
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const alertingContext = await context.alerting;
        const rulesClient = await alertingContext.getRulesClient();
        const body: GetGapsInfoByRuleIdsQueryV1 = req.body;
        const result = await rulesClient.getGapsInfoByRuleIds(transformRequestV1(body));
        const response: GetGapsInfoByRuleIdsResponseV1 = {
          body: transformResponseV1(result),
        };
        return res.ok(response);
      })
    )
  );
};
