/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IRouter } from '@kbn/core/server';
import type {
  GetRuleIdsWithGapBodyV1,
  GetRuleIdsWithGapResponseV1,
} from '../../../../../common/routes/gaps/apis/get_rules_with_gaps';
import { getRuleIdsWithGapBodySchemaV1 } from '../../../../../common/routes/gaps/apis/get_rules_with_gaps';
import type { ILicenseState } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../types';
import { INTERNAL_ALERTING_GAPS_GET_RULES_API_PATH } from '../../../../types';
import { transformRequestV1, transformResponseV1 } from './transforms';

export const getRuleIdsWithGapsRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${INTERNAL_ALERTING_GAPS_GET_RULES_API_PATH}`,
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
      validate: {
        body: getRuleIdsWithGapBodySchemaV1,
      },
      options: {
        access: 'internal',
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const alertingContext = await context.alerting;
        const rulesClient = await alertingContext.getRulesClient();
        const body: GetRuleIdsWithGapBodyV1 = req.body;
        const result = await rulesClient.getRuleIdsWithGaps(transformRequestV1(body));
        const response: GetRuleIdsWithGapResponseV1 = {
          body: transformResponseV1(result),
        };
        return res.ok(response);
      })
    )
  );
};
