/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { ILicenseState } from '../../lib';
import { AlertingRequestHandlerContext, INTERNAL_BASE_ALERTING_API_PATH } from '../../types';
import { verifyAccessAndContext } from '../lib';
import { API_PRIVILEGES } from '../../../common';
import { AlertDeletionPreviewResponseV1, alertDeletionPreviewQuerySchemaV1 } from './shared';
import {
  transformAlertDeletionPreviewToResponse,
  transformRequestToAlertDeletionPreviewV1,
} from './transforms';

export const getAlertDeletionPreviewRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/alert_deletion/preview`,
      validate: {
        query: alertDeletionPreviewQuerySchemaV1,
      },
      security: {
        authz: {
          requiredPrivileges: [`${API_PRIVILEGES.READ_ALERT_DELETION_SETTINGS}`],
        },
      },
      options: {
        access: 'internal',
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const alertingContext = await context.alerting;
        const alertDeletionClient = alertingContext.getAlertDeletionClient();
        const rulesClient = await alertingContext.getRulesClient();
        const spaceId = rulesClient.getSpaceId();
        const settings = transformRequestToAlertDeletionPreviewV1(req.query);

        // TODO: clarify what happens when spaceId is undefined
        const affectedAlertCount = await alertDeletionClient.previewTask(
          settings,
          spaceId || 'default'
        );
        const response: AlertDeletionPreviewResponseV1 = transformAlertDeletionPreviewToResponse({
          affectedAlertCount,
        });
        return res.ok(response);
      })
    )
  );
};
