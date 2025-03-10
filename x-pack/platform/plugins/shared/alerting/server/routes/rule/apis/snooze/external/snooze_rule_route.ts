/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { v4 } from 'uuid';
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
        summary: 'Schedule a snooze for the rule',
        description:
          'When you snooze a rule, the rule checks continue to run but alerts will not generate actions. You can snooze for a specified period of time or indefinitely and schedule single or recurring downtimes.',
        tags: ['oas-tag:alerting'],
        availability: {
          since: '8.19.0',
          stability: 'stable',
        },
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

        const snoozeScheduleId = v4();

        try {
          const snoozedRule = await rulesClient.snooze({
            ...params,
            snoozeSchedule: {
              duration,
              rRule: rRule as SnoozeRuleOptions['snoozeSchedule']['rRule'],
              id: snoozeScheduleId,
            },
          });

          const createdSchedule = snoozedRule.snoozeSchedule?.find(
            (schedule) => schedule.id === snoozeScheduleId
          );

          const response: SnoozeResponse = {
            body: {
              schedule: {
                id: snoozeScheduleId,
                custom: transformRRuleToCustomSchedule(createdSchedule),
              },
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
