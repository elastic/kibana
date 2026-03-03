/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { GetRuleTypesInternalResponseBodyV1 } from '../../../../../../common/routes/rule/apis/list_types/internal';
import { getRuleTypesInternalResponseSchemaV1 } from '../../../../../../common/routes/rule/apis/list_types/internal';
import type { ILicenseState } from '../../../../../lib';
import { verifyAccessAndContext } from '../../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../../types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../../../../types';
import { transformRuleTypesInternalResponseV1 } from './transforms';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../../constants';

export const getRuleTypesInternalRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/_rule_types`,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options: {
        access: 'internal',
      },
      validate: {
        request: {},
        response: {
          200: {
            body: () => getRuleTypesInternalResponseSchemaV1,
            description: 'Indicates a successful call.',
          },
          401: {
            description: 'Authorization information is missing or invalid.',
          },
        },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = await (await context.alerting).getRulesClient();
        const ruleTypes = await rulesClient.listRuleTypes();

        const responseBody: GetRuleTypesInternalResponseBodyV1 =
          transformRuleTypesInternalResponseV1(ruleTypes);

        return res.ok({
          body: responseBody,
        });
      })
    )
  );
};
