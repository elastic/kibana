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

export const getRulesWithGapsRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_ALERTING_GAPS_GET_RULES_API_PATH}`,
      validate: {
        query: getRulesWithGapQuerySchemaV1,
      },
      options: {
        access: 'internal',
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = (await context.alerting).getRulesClient();
        const query: GetRulesWithGapQueryV1 = req.query;

        const result = await rulesClient.getRulesWithGaps(query);
        const response: GetRulesWithGapResponseV1 = {
          body: result,
        };
        return res.ok(response);
      })
    )
  );
};
