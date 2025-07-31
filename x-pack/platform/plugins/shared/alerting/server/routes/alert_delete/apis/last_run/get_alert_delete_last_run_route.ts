/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { AlertDeleteLastRunResponseV1 } from '../../../../../common/routes/alert_delete';
import type { ILicenseState } from '../../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../../../types';
import { verifyAccessAndContext } from '../../../lib';
import { API_PRIVILEGES } from '../../../../../common';
import { transformAlertDeleteLastRunToResponse } from '../../transforms';

export const alertDeleteLastRunRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/settings/_alert_delete_last_run`,
      validate: {},
      security: {
        authz: {
          requiredPrivileges: [`${API_PRIVILEGES.READ_ALERT_DELETE_SETTINGS}`],
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
        const lastRun = await alertDeletionClient.getLastRun(req);
        const response: AlertDeleteLastRunResponseV1 = transformAlertDeleteLastRunToResponse({
          lastRun,
        });
        return res.ok({ body: response });
      })
    )
  );
};
