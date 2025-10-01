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
import { INTERNAL_ALERTING_GAPS_GET_SUMMARY_FOR_ALL_RULES_API_PATH } from '../../../../types';
import {
  getGapsSummaryForAllRulesBodySchemaV1,
  type GetGapsSummaryForAllRulesBodyV1,
  type GetGapsSummaryForAllRulesResponseV1,
} from '../../../../../common/routes/gaps/apis/get_gaps_summary_for_all_rules';

import { transformRequestV1, transformResponseV1 } from './transforms';

export const getGapsSummaryForAllRulesRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${INTERNAL_ALERTING_GAPS_GET_SUMMARY_FOR_ALL_RULES_API_PATH}`,
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
      validate: {
        body: getGapsSummaryForAllRulesBodySchemaV1,
      },
      options: {
        access: 'internal',
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const alertingContext = await context.alerting;
        const rulesClient = await alertingContext.getRulesClient();
        const body: GetGapsSummaryForAllRulesBodyV1 = req.body;
        const result = await rulesClient.getGapsSummaryForAllRules(transformRequestV1(body));
        const response: GetGapsSummaryForAllRulesResponseV1 = {
          body: transformResponseV1(result),
        };
        return res.ok(response);
      })
    )
  );
};
