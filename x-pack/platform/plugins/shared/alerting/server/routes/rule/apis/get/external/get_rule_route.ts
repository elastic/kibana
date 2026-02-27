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
import { BASE_ALERTING_API_PATH } from '../../../../../types';
import { transformGetResponseV1 } from './transforms';

import type {
  GetRuleRequestParamsV1,
  GetRuleResponseV1,
} from '../../../../../../common/routes/rule/apis/get/external';
import {
  getRuleRequestParamsSchemaV1,
  getRuleResponseSchemaV1,
} from '../../../../../../common/routes/rule/apis/get/external';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../../constants';

export const getRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${BASE_ALERTING_API_PATH}/rule/{id}`,
      options: {
        access: 'public',
        summary: `Get rule details`,
        tags: ['oas-tag:alerting'],
      },
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      validate: {
        request: {
          params: getRuleRequestParamsSchemaV1,
        },
        response: {
          200: {
            body: () => getRuleResponseSchemaV1,
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
        const params: GetRuleRequestParamsV1 = req.params;

        // TODO (http-versioning): Remove this cast, this enables us to move forward
        // without fixing all of other solution types
        const rule: Rule<RuleParamsV1> = (await rulesClient.get({
          id: params.id,
        })) as Rule<RuleParamsV1>;

        const response: GetRuleResponseV1<RuleParamsV1> = {
          body: transformGetResponseV1<RuleParamsV1>(rule),
        };
        return res.ok(response);
      })
    )
  );
};
