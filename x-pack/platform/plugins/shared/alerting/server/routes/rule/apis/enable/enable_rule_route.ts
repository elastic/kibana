/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { ILicenseState } from '../../../../lib';
import { RuleTypeDisabledError } from '../../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../types';
import { BASE_ALERTING_API_PATH } from '../../../../types';
import { verifyAccessAndContext } from '../../../lib';

import type { EnableRuleRequestParamsV1 } from '../../../../../common/routes/rule/apis/enable';
import { enableRuleRequestParamsSchemaV1 } from '../../../../../common/routes/rule/apis/enable';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../constants';
export const enableRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${BASE_ALERTING_API_PATH}/rule/{id}/_enable`,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options: {
        access: 'public',
        summary: 'Enable a rule',
        tags: ['oas-tag:alerting'],
      },
      validate: {
        request: {
          params: enableRuleRequestParamsSchemaV1,
        },
        response: {
          204: {
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
        const rulesClient = await (await context.alerting).getRulesClient();
        const params: EnableRuleRequestParamsV1 = req.params;

        try {
          await rulesClient.enableRule(params);
          return res.noContent();
        } catch (e) {
          if (e instanceof RuleTypeDisabledError) {
            return e.sendResponse(res);
          }
          throw e;
        }
      })
    )
  );
};
