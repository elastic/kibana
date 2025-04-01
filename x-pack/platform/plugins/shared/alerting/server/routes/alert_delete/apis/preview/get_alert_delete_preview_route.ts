/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { AlertDeletePreviewResponseV1 } from '../../../../../common/routes/rule/apis/alert_delete';
import { alertDeletePreviewQuerySchemaV1 } from '../../../../../common/routes/rule/apis/alert_delete';
import type { ILicenseState } from '../../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../../../types';
import { verifyAccessAndContext } from '../../../lib';
import { API_PRIVILEGES } from '../../../../../common';
import {
  transformAlertDeletePreviewToResponse,
  transformRequestToAlertDeletePreviewV1,
} from '../../transforms';

// TODO: Remove this when the alert deletion client is available
class FakeAlertDeleteClient {
  previewTask = async (settings: unknown, spaceId: string) => {
    return 5;
  };
}

export const alertDeletePreviewRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/settings/_alert_delete_preview`,
      validate: {
        query: alertDeletePreviewQuerySchemaV1,
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
        const alertDeletionClient = new FakeAlertDeleteClient();
        const rulesClient = await alertingContext.getRulesClient();
        const spaceId = rulesClient.getSpaceId();
        const settings = transformRequestToAlertDeletePreviewV1(req.query);

        const affectedAlertCount = await alertDeletionClient.previewTask(
          settings,
          spaceId || 'default'
        );
        const response: AlertDeletePreviewResponseV1 = transformAlertDeletePreviewToResponse({
          affectedAlertCount,
        });
        return res.ok(response);
      })
    )
  );
};
