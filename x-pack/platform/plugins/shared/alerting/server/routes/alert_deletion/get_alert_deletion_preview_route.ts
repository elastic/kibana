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
import { AlertDeletionPreviewResponseV1, alertDeletionPreviewSchemaV1 } from './shared';
import { transformAlertDeletionPreviewToResponse } from './transforms';

export const getAlertDeletionPreviewRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/alert_deletion/preview`,
      validate: {
        query: alertDeletionPreviewSchemaV1,
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
        console.log('********************* running');
        const alertingContext = await context.alerting;
        console.log(2);
        const alertDeletionClient = await alertingContext.getAlertDeletionClient();
        console.log(3);
        const rulesClient = await alertingContext.getRulesClient();
        console.log(4);
        const spaceId = rulesClient.getSpaceId();
        console.log({ spaceId });

        const affectedAlertCount = await alertDeletionClient.previewTask(req.query, spaceId);
        const response: AlertDeletionPreviewResponseV1 = transformAlertDeletionPreviewToResponse({
          affectedAlertCount,
        });
        return res.ok(response);
      })
    )
  );
};
