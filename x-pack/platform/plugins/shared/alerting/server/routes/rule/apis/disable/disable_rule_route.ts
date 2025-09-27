/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type {
  DisableRuleRequestBodyV1,
  DisableRuleRequestParamsV1,
} from '../../../../../common/routes/rule/apis/disable';
import {
  disableRuleRequestBodySchemaV1,
  disableRuleRequestParamsSchemaV1,
} from '../../../../../common/routes/rule/apis/disable';
import type { ILicenseState } from '../../../../lib';
import { RuleTypeDisabledError } from '../../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../types';
import { BASE_ALERTING_API_PATH } from '../../../../types';
import { verifyAccessAndContext } from '../../../lib';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../constants';

export const disableRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${BASE_ALERTING_API_PATH}/rule/{id}/_disable`,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options: {
        access: 'public',
        summary: 'Disable a rule',
        tags: ['oas-tag:alerting'],
      },
      validate: {
        request: {
          params: disableRuleRequestParamsSchemaV1,
          body: disableRuleRequestBodySchemaV1,
        },
        response: {
          204: {
            description: 'Indicates a successful call.',
          },
          400: {
            description: 'Indicates an invalid schema.',
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
        const ruleTypes = alertingContext.listTypes();

        const { id }: DisableRuleRequestParamsV1 = req.params;
        const body: DisableRuleRequestBodyV1 = req.body || {};
        const { untrack = false } = body;

        const disableParams = { id, untrack };

        try {
          const rule = await rulesClient.get({ id });
          const ruleType = ruleTypes.get(rule.alertTypeId);

          /**
           * Throws a bad request (400) if the rule type is internallyManaged
           * ruleType will always exist here because ruleTypes.get will throw a 400
           * error if the rule type is not registered.
           */
          if (ruleType?.internallyManaged) {
            return res.badRequest({
              body: {
                message: `Cannot disable rule of type "${rule.alertTypeId}" because it is internally managed.`,
              },
            });
          }

          await rulesClient.disableRule(disableParams);
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
