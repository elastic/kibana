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
  createMaintenanceWindowRequestBodySchemaV1,
  CreateMaintenanceWindowRequestBodyV1,
  CreateMaintenanceWindowResponseV1,
} from '../../../../../../common/routes/maintenance_window/external/apis/create';
import { maintenanceWindowResponseSchemaV1 } from '../../../../../../common/routes/maintenance_window/external/response';
import { transformMaintenanceWindowToResponseV1 } from '../common/transforms';
import { transformCreateBodyV1 } from './transform_create_body';

export const createMaintenanceWindowRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: BASE_MAINTENANCE_WINDOW_API_PATH,
      validate: {
        request: {
          body: createMaintenanceWindowRequestBodySchemaV1,
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
        },
      },
      security: {
        authz: {
          requiredPrivileges: [`${MAINTENANCE_WINDOW_API_PRIVILEGES.WRITE_MAINTENANCE_WINDOW}`],
        },
      },
      options: {
        access: 'public',
        summary: 'Create a maintenance window.',
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        licenseState.ensureLicenseForMaintenanceWindow();

        const body: CreateMaintenanceWindowRequestBodyV1 = req.body;

        const maintenanceWindowClient = (await context.alerting).getMaintenanceWindowClient();

        const maintenanceWindow: MaintenanceWindow = await maintenanceWindowClient.create({
          data: transformCreateBodyV1(body),
        });

        const response: CreateMaintenanceWindowResponseV1 =
          transformMaintenanceWindowToResponseV1(maintenanceWindow);

        return res.ok({
          body: response,
        });
      })
    )
  );
};
