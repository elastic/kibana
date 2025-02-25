/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
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
  transformCustomScheduleToRRule,
  transformRRuleToCustomSchedule,
} from '../../../../../../common/routes/schedule';
import type { SnoozeRule } from '../../../../../application/rule/methods/snooze';

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
        summary: 'Schedule a snooze for the rule',
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
            description: 'Indicates a rule with the given id does not exist.',
          },
        },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const alertingContext = await context.alerting;
        const rulesClient = await alertingContext.getRulesClient();
        const params: SnoozeParams = req.params;
        const customSchedule = req.body.schedule?.custom;

        if (!customSchedule) {
          throw Boom.badRequest('Custom schedule is required');
        }

        const { rRule, duration } = transformCustomScheduleToRRule(customSchedule);

        const snoozeSchedule = {
          duration,
          rRule: rRule as SnoozeRule['snoozeSchedule']['rRule'],
        };

        try {
          const snoozedRule = await rulesClient.snooze({
            ...params,
            snoozeSchedule,
          });

          const createdSchedule = {
            id: (snoozedRule?.snoozeSchedule?.length
              ? snoozedRule?.snoozeSchedule[snoozedRule.snoozeSchedule.length - 1].id
              : '') as string,
            custom: transformRRuleToCustomSchedule(
              snoozedRule?.snoozeSchedule?.[snoozedRule.snoozeSchedule.length - 1]
            ),
          };

          const response: SnoozeResponse = {
            body: {
              schedule: createdSchedule,
            },
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
