/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { AlertDeletionPreviewResponseV1 } from '../../../../../common/routes/rule/apis/alert_deletion';
import { alertDeletionPreviewQuerySchemaV1 } from '../../../../../common/routes/rule/apis/alert_deletion';
import type { ILicenseState } from '../../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../../../types';
import { verifyAccessAndContext } from '../../../lib';
import { API_PRIVILEGES } from '../../../../../common';
import {
  transformAlertDeletionPreviewToResponse,
  transformRequestToAlertDeletionPreviewV1,
} from '../../transforms';

// TODO: Remove this when the alert deletion client is available
class FakeAlertDeletionClient {
  previewTask = async (settings: unknown, spaceId: string) => {
    return 5;
  };
}

export const alertDeletionPreviewRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      // TODO: Should it still be here if it's no setting anymore?
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/settings/_alert_deletion_preview`,
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
        // TODO: Use this when the alert deletion client is available
        // const alertDeletionClient = alertingContext.getAlertDeletionClient();
        const alertDeletionClient = new FakeAlertDeletionClient();
        const rulesClient = await alertingContext.getRulesClient();
        const spaceId = rulesClient.getSpaceId();
        const settings = transformRequestToAlertDeletionPreviewV1(req.query);

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
