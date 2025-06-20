/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { v4 } from 'uuid';
import type { IRouter } from '@kbn/core/server';
import {
  type SnoozeParamsV1,
  type SnoozeResponseV1,
  snoozeBodySchemaV1,
  snoozeParamsSchemaV1,
  snoozeResponseSchemaV1,
} from '../../../../../../common/routes/rule/apis/snooze';
import type { ILicenseState } from '../../../../../lib';
import { RuleMutedError } from '../../../../../lib';
import { verifyAccessAndContext } from '../../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../../types';
import { BASE_ALERTING_API_PATH } from '../../../../../types';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../../constants';
import {
  transformCustomScheduleToRRule,
  transformRRuleToCustomSchedule,
} from '../../../../../../common/routes/schedule';

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
          'When you snooze a rule, the rule checks continue to run but alerts will not generate actions. You can snooze for a specified period of time and schedule single or recurring downtimes.',
        tags: ['oas-tag:alerting'],
        availability: {
          since: '8.19.0',
          stability: 'stable',
        },
      },
      validate: {
        request: {
          params: snoozeParamsSchemaV1,
          body: snoozeBodySchemaV1,
        },
        response: {
          200: {
            body: () => snoozeResponseSchemaV1,
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
        const params: SnoozeParamsV1 = req.params;
        const customSchedule = req.body.schedule?.custom;

        if (!customSchedule) {
          throw Boom.badRequest('A schedule is required');
        }

        const { rRule, duration } = transformCustomScheduleToRRule(customSchedule);

        const snoozeScheduleId = v4();

        try {
          const snoozedRule = await rulesClient.snooze({
            id: params.id,
            snoozeSchedule: {
              duration,
              rRule,
              id: snoozeScheduleId,
            },
          });

          const createdSchedule = snoozedRule.snoozeSchedule?.find(
            (schedule) => schedule.id === snoozeScheduleId
          );

          let transformedCustomSchedule;

          if (createdSchedule) {
            transformedCustomSchedule = transformRRuleToCustomSchedule(createdSchedule);
          }

          const response: SnoozeResponseV1 = {
            body: {
              schedule: {
                id: snoozeScheduleId,
                ...(transformedCustomSchedule && {
                  custom: {
                    ...transformedCustomSchedule,
                    duration: customSchedule.duration,
                  },
                }),
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
