/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { IRouter } from '@kbn/core/server';
import { validateInternalRuleType } from '../../../../lib/validate_internal_rule_type';
import {
  unsnoozeParamsSchema,
  type UnsnoozeParams,
} from '../../../../../../common/routes/rule/apis/unsnooze';
import type { ILicenseState } from '../../../../../lib';
import { RuleMutedError } from '../../../../../lib';
import { verifyAccessAndContext } from '../../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../../types';
import { BASE_ALERTING_API_PATH } from '../../../../../types';
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
        availability: {
          since: '8.19.0',
          stability: 'stable',
        },
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
        const ruleTypes = alertingContext.listTypes();

        const { ruleId, scheduleId }: UnsnoozeParams = req.params;
        try {
          const currentRule = await rulesClient.get({ id: ruleId });

          validateInternalRuleType({
            ruleTypeId: currentRule.alertTypeId,
            ruleTypes,
            operationText: 'unsnooze',
          });

          if (!currentRule.snoozeSchedule?.length) {
            throw Boom.badRequest('Rule has no snooze schedules.');
          }

          const scheduleToUnsnooze = currentRule.snoozeSchedule?.find(
            (schedule) => schedule.id === scheduleId
          );

          if (!scheduleToUnsnooze) {
            throw Boom.notFound(`Rule has no snooze schedule with id ${scheduleId}.`);
          }

          await rulesClient.unsnooze({ id: ruleId, scheduleIds: [scheduleId] });
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
