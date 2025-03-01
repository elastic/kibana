/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type { ILicenseState } from '../../../../lib';
import { RuleTypeDisabledError } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../types';
import { BASE_ALERTING_API_PATH } from '../../../../types';
import { trackDeprecatedRouteUsage } from '../../../../lib/track_deprecated_route_usage';
import type { MuteAllRuleRequestParamsV1 } from '../../../../../common/routes/rule/apis/mute_all';
import { muteAllRuleRequestParamsSchemaV1 } from '../../../../../common/routes/rule/apis/mute_all';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../constants';

export const muteAllRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState,
  usageCounter?: UsageCounter
) => {
  router.post(
    {
      path: `${BASE_ALERTING_API_PATH}/rule/{id}/_mute_all`,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options: {
        access: 'public',
        summary: `Mute all alerts`,
        tags: ['oas-tag:alerting'],
      },
      validate: {
        request: {
          params: muteAllRuleRequestParamsSchemaV1,
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
        const alertingContext = await context.alerting;
        const rulesClient = await alertingContext.getRulesClient();
        const params: MuteAllRuleRequestParamsV1 = req.params;
        trackDeprecatedRouteUsage('muteAll', usageCounter);
        try {
          await rulesClient.muteAll(params);
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
