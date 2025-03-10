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
  archiveMaintenanceWindowRequestParamsSchemaV1,
  archiveMaintenanceWindowRequestBodySchemaV1,
  ArchiveMaintenanceWindowRequestBodyV1,
  ArchiveMaintenanceWindowRequestParamsV1,
  ArchiveMaintenanceWindowResponseV1,
} from '../../../../../../common/routes/maintenance_window/external/apis/archive';
import { maintenanceWindowResponseSchemaV1 } from '../../../../../../common/routes/maintenance_window/external/response';
import { transformMaintenanceWindowToResponseV1 } from '../common/transforms';

export const archiveMaintenanceWindowRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${BASE_MAINTENANCE_WINDOW_API_PATH}/{id}/_archive`,
      validate: {
        request: {
          params: archiveMaintenanceWindowRequestParamsSchemaV1,
          body: archiveMaintenanceWindowRequestBodySchemaV1,
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
          requiredPrivileges: [`${MAINTENANCE_WINDOW_API_PRIVILEGES.WRITE_MAINTENANCE_WINDOW}`],
        },
      },
      options: {
        access: 'public',
        summary: 'Archives/Unarchives a maintenance window by ID.',
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        licenseState.ensureLicenseForMaintenanceWindow();

        const params: ArchiveMaintenanceWindowRequestParamsV1 = req.params;
        const body: ArchiveMaintenanceWindowRequestBodyV1 = req.body;

        const maintenanceWindowClient = (await context.alerting).getMaintenanceWindowClient();

        const maintenanceWindow: MaintenanceWindow = await maintenanceWindowClient.archive({
          id: params.id,
          archive: body.archive,
        });

        const response: ArchiveMaintenanceWindowResponseV1 = {
          body: transformMaintenanceWindowToResponseV1(maintenanceWindow),
        };

        return res.ok(response);
      })
    )
  );
};
