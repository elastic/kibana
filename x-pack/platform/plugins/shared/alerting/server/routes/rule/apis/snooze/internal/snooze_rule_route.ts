/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import {
  snoozeBodyInternalSchema,
  snoozeParamsInternalSchema,
} from '../../../../../../common/routes/rule/apis/snooze';
import { type ILicenseState, RuleMutedError } from '../../../../../lib';
import { verifyAccessAndContext } from '../../../../lib';
import {
  type AlertingRequestHandlerContext,
  INTERNAL_ALERTING_SNOOZE_RULE,
} from '../../../../../types';
import { transformSnoozeBodyV1 } from './transforms';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../../constants';

export type SnoozeRuleRequestInternalParamsV1 = TypeOf<typeof snoozeParamsInternalSchema>;

export const snoozeRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: INTERNAL_ALERTING_SNOOZE_RULE,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options: { access: 'internal' },
      validate: {
        params: snoozeParamsInternalSchema,
        body: snoozeBodyInternalSchema,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const alertingContext = await context.alerting;
        const rulesClient = await alertingContext.getRulesClient();
        const params: SnoozeRuleRequestInternalParamsV1 = req.params;
        const body = transformSnoozeBodyV1(req.body);
        try {
          await rulesClient.snooze({ ...params, ...body });
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
