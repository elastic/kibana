/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';

import type { ILicenseState } from '../../../../lib';
import { RuleTypeDisabledError } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../../../types';
import type { BulkMuteUnmuteAlertsRequestBodyV1 } from '../../../../../common/routes/rule/apis/bulk_mute_unmute';
import {
  bulkMuteUnmuteAlertsBodySchemaV1,
  transformBulkMuteUnmuteAlertsBodyV1,
} from '../../../../../common/routes/rule/apis/bulk_mute_unmute';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../constants';
import { validateMaxMuteUnmuteInstancesV1 } from '../../validation';

export const bulkMuteAlertsRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/alerts/_bulk_mute`,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options: {
        access: 'internal',
        summary: `Bulk mute alerts`,
      },
      validate: {
        body: bulkMuteUnmuteAlertsBodySchemaV1,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const alertingContext = await context.alerting;
        const rulesClient = await alertingContext.getRulesClient();
        const body: BulkMuteUnmuteAlertsRequestBodyV1 = req.body;

        validateMaxMuteUnmuteInstancesV1(body);

        const args = transformBulkMuteUnmuteAlertsBodyV1(body);

        try {
          await rulesClient.bulkMuteInstances({ rules: args });

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
