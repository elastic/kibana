/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import { IRouter } from '@kbn/core/server';
import {
  type SnoozeParams,
  type SnoozeResponse,
  snoozeBodySchema,
  snoozeParamsSchema,
  snoozeResponseSchema,
} from '../../../../../../common/routes/rule/apis/snooze';
import { ILicenseState, RuleMutedError } from '../../../../../lib';
import { verifyAccessAndContext } from '../../../../lib';
import { AlertingRequestHandlerContext, BASE_ALERTING_API_PATH } from '../../../../../types';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../../constants';
import {
  transformScheduleToRRule,
  transformRRuleToSchedule,
} from '../../../../../../common/routes/schedule';
import type { SnoozeRuleOptions } from '../../../../../application/rule/methods/snooze';

export const snoozeRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${BASE_ALERTING_API_PATH}/rule/{id}/snooze_schedule`,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options: {
        access: 'public',
        summary: 'Snooze a rule',
        tags: ['oas-tag:alerting'],
      },
      validate: {
        request: {
          params: snoozeParamsSchema,
          body: snoozeBodySchema,
        },
        response: {
          200: {
            body: () => snoozeResponseSchema,
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
        const params: SnoozeParams = req.params;
        const { rRule, duration } = transformScheduleToRRule(req.body.schedule);
        const snoozeSchedule = {
          id: uuidV4(),
          duration,
          rRule: rRule as SnoozeRuleOptions['snoozeSchedule']['rRule'],
        };

        try {
          const snoozedRule = await rulesClient.snooze({
            ...params,
            snoozeSchedule,
          });

          const response: SnoozeResponse = {
            body: transformRRuleToSchedule(snoozedRule?.snoozeSchedule),
          };

          return res.ok(response);
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
