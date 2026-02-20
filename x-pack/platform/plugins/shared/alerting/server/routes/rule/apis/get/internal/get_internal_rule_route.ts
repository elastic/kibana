/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { ILicenseState } from '../../../../../lib';
import { verifyAccessAndContext } from '../../../../lib';
import type { RuleParamsV1 } from '../../../../../../common/routes/rule/response';
import type { Rule } from '../../../../../application/rule/types';
import type { AlertingRequestHandlerContext } from '../../../../../types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../../../../types';
import { transformGetResponseInternalV1 } from './transforms';

import type {
  GetInternalRuleRequestParamsV1,
  GetInternalRuleResponseV1,
} from '../../../../../../common/routes/rule/apis/get/internal';
import { getInternalRuleRequestParamsSchemaV1 } from '../../../../../../common/routes/rule/apis/get/internal';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../../constants';

export const getInternalRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rule/{id}`,
      options: { access: 'internal' },
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      validate: {
        request: {
          params: getInternalRuleRequestParamsSchemaV1,
        },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const alertingContext = await context.alerting;
        const rulesClient = await alertingContext.getRulesClient();
        const params: GetInternalRuleRequestParamsV1 = req.params;

        // TODO (http-versioning): Remove this cast, this enables us to move forward
        // without fixing all of other solution types
        const rule: Rule<RuleParamsV1> = (await rulesClient.get({
          id: params.id,
        })) as Rule<RuleParamsV1>;

        const response: GetInternalRuleResponseV1<RuleParamsV1> = {
          body: transformGetResponseInternalV1<RuleParamsV1>(rule),
        };
        return res.ok(response);
      })
    )
  );
};
