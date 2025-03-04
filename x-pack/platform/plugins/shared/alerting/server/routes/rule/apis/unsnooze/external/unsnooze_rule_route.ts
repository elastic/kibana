/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import {
  unsnoozeParamsSchema,
  type UnsnoozeParams,
} from '../../../../../../common/routes/rule/apis/unsnooze';
import { ILicenseState, RuleMutedError } from '../../../../../lib';
import { verifyAccessAndContext } from '../../../../lib';
import { AlertingRequestHandlerContext, BASE_ALERTING_API_PATH } from '../../../../../types';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../../constants';

export const unsnoozeRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.delete(
    {
      path: `${BASE_ALERTING_API_PATH}/rule/{ruleId}/snooze_schedule/{scheduleId}`,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options: {
        access: 'public',
        summary: 'Delete a snooze schedule for a rule',
        tags: ['oas-tag:alerting'],
      },
      validate: {
        request: {
          params: unsnoozeParamsSchema,
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
            description: 'Indicates a rule with the given id does not exist.',
          },
        },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const alertingContext = await context.alerting;
        const rulesClient = await alertingContext.getRulesClient();
        const { ruleId, scheduleId }: UnsnoozeParams = req.params;
        try {
          await rulesClient.unsnooze({ id: ruleId, scheduleIds: [scheduleId], isPublic: true });
          return res.noContent();
        } catch (e) {
          if (e instanceof RuleMutedError) {
            return e.sendResponse(res);
          }
          throw e;
        }
      })
    )
  );
};
