/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IRouter } from '@kbn/core/server';
import {
  transformRequestParamsToApplicationV1,
  transformRequestQueryToApplicationV1,
} from './transforms';
import type { ILicenseState } from '../../../../lib';
import { RuleTypeDisabledError } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../types';
import { BASE_ALERTING_API_PATH } from '../../../../types';
import type {
  MuteAlertRequestQueryV1,
  MuteAlertRequestParamsV1,
} from '../../../../../common/routes/rule/apis/mute_alert';
import {
  muteAlertParamsSchemaV1,
  muteAlertQuerySchemaV1,
} from '../../../../../common/routes/rule/apis/mute_alert';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../constants';

export const muteAlertRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${BASE_ALERTING_API_PATH}/rule/{rule_id}/alert/{alert_id}/_mute`,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options: {
        access: 'public',
        summary: `Mute an alert`,
        tags: ['oas-tag:alerting'],
      },
      validate: {
        request: {
          params: muteAlertParamsSchemaV1,
          query: muteAlertQuerySchemaV1,
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
            description: 'Indicates a rule or alert with the given ID does not exist.',
          },
        },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const alertingContext = await context.alerting;
        const rulesClient = await alertingContext.getRulesClient();
        const params: MuteAlertRequestParamsV1 = req.params;
        const query: MuteAlertRequestQueryV1 = req.query || {};

        try {
          await rulesClient.muteInstance({
            params: transformRequestParamsToApplicationV1(params),
            query: transformRequestQueryToApplicationV1(query),
          });
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
