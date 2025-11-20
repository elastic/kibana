/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { RuleTemplateResponseV1 } from '../../../../../common/routes/rule_template/response';
import { ruleTemplateResponseSchemaV1 } from '../../../../../common/routes/rule_template/response';
import {
  type GetRuleTemplateRequestParamsV1,
  getRuleTemplateRequestParamsSchemaV1,
} from '../../../../../common/routes/rule_template/apis/get';
import type { ILicenseState } from '../../../../lib';

import {
  INTERNAL_BASE_ALERTING_API_PATH,
  type AlertingRequestHandlerContext,
} from '../../../../types';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../constants';
import { verifyAccessAndContext } from '../../../lib';
import { transformGetResponse } from './transforms/transform_to_get_response';

export const getInternalRuleTemplateRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rule_template/{id}`,
      options: { access: 'internal' },
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      validate: {
        request: {
          params: getRuleTemplateRequestParamsSchemaV1,
        },
        response: {
          200: {
            body: () => ruleTemplateResponseSchemaV1,
            description: 'Indicates a successful call.',
          },
          400: {
            description: 'Indicates an invalid schema or parameters.',
          },
          403: {
            description: 'Indicates that this call is forbidden.',
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
        const params: GetRuleTemplateRequestParamsV1 = req.params;

        const ruleTemplate = await rulesClient.getTemplate({
          id: params.id,
        });
        const response: { body: RuleTemplateResponseV1 } = {
          body: transformGetResponse(ruleTemplate),
        };
        return res.ok(response);
      })
    )
  );
};
