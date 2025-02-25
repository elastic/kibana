/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { ILicenseState } from '../../../../../lib';
import { verifyAccessAndContext } from '../../../../lib';
import {
  AlertingRequestHandlerContext,
  BASE_MAINTENANCE_WINDOW_API_PATH,
} from '../../../../../types';
import { MAINTENANCE_WINDOW_API_PRIVILEGES } from '../../../../../../common';
import { MaintenanceWindow } from '../../../../../application/maintenance_window/types';
import {
  getParamsSchemaV1,
  GetMaintenanceWindowRequestParamsV1,
  GetMaintenanceWindowResponseV1,
} from '../../../../../../common/routes/maintenance_window/external/apis/get';
import { maintenanceWindowResponseSchemaV1 } from '../../../../../../common/routes/maintenance_window/external/response';
import { transformMaintenanceWindowToResponseV1 } from '../common/transforms';

export const getMaintenanceWindowRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${BASE_MAINTENANCE_WINDOW_API_PATH}/{id}`,
      validate: {
        request: {
          params: getParamsSchemaV1,
        },
        response: {
          200: {
            body: () => maintenanceWindowResponseSchemaV1,
            description: 'Indicates a successful call.',
          },
          400: {
            description: 'Indicates an invalid schema or parameters.',
          },
          403: {
            description: 'Indicates that this call is forbidden.',
          },
          404: {
            description: 'Indicates a maintenance window with the given ID does not exist.',
          },
        },
      },
      security: {
        authz: {
          requiredPrivileges: [`${MAINTENANCE_WINDOW_API_PRIVILEGES.READ_MAINTENANCE_WINDOW}`],
        },
      },
      options: {
        access: 'public',
        summary: 'Gets a maintenance window by ID.',
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        licenseState.ensureLicenseForMaintenanceWindow();

        const maintenanceWindowClient = (await context.alerting).getMaintenanceWindowClient();

        const params: GetMaintenanceWindowRequestParamsV1 = req.params;

        const maintenanceWindow: MaintenanceWindow = await maintenanceWindowClient.get({
          id: params.id,
        });

        const response: GetMaintenanceWindowResponseV1 =
          transformMaintenanceWindowToResponseV1(maintenanceWindow);

        return res.ok({
          body: response,
        });
      })
    )
  );
};
