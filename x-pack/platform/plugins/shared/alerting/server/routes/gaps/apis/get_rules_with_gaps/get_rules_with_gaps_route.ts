/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IRouter } from '@kbn/core/server';
import {
  getRulesWithGapQuerySchemaV1,
  GetRulesWithGapQueryV1,
  GetRulesWithGapResponseV1,
} from '../../../../../common/routes/gaps/apis/get_rules_with_gaps';
import { ILicenseState } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import {
  AlertingRequestHandlerContext,
  INTERNAL_ALERTING_GAPS_GET_RULES_API_PATH,
} from '../../../../types';
import { transformResponseV1 } from './transforms';

export const getRulesWithGapsRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${INTERNAL_ALERTING_GAPS_GET_RULES_API_PATH}`,
      validate: {
        body: getRulesWithGapQuerySchemaV1,
      },
      options: {
        access: 'internal',
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const alertingContext = await context.alerting;
        const rulesClient = await alertingContext.getRulesClient();
        const body: GetRulesWithGapQueryV1 = req.body;
        const result = await rulesClient.getRulesWithGaps(body);
        const response: GetRulesWithGapResponseV1 = {
          body: transformResponseV1(result),
        };
        return res.ok(response);
      })
    )
  );
};
