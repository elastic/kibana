/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { ILicenseState } from '../../../../../lib';
import { verifyAccessAndContext } from '../../../../lib';
import type { MaintenanceWindowRequestHandlerContext } from '../../../../../types';
import { ARCHIVE_MAINTENANCE_WINDOW_API_PATH } from '../../../../../../common';
import { MAINTENANCE_WINDOW_API_PRIVILEGES } from '../../../../../../common';
import type { MaintenanceWindow } from '../../../../../application/types';
import type {
  ArchiveMaintenanceWindowRequestParamsV1,
  ArchiveMaintenanceWindowResponseV1,
} from '../../../../schemas/maintenance_window/external/request/archive';
import { archiveMaintenanceWindowRequestParamsSchemaV1 } from '../../../../schemas/maintenance_window/external/request/archive';
import { maintenanceWindowResponseSchemaV1 } from '../../../../schemas/maintenance_window/external/response';
import { transformInternalMaintenanceWindowToExternalV1 } from '../common/transforms';

export const archiveMaintenanceWindowRoute = (
  router: IRouter<MaintenanceWindowRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: ARCHIVE_MAINTENANCE_WINDOW_API_PATH,
      validate: {
        request: {
          params: archiveMaintenanceWindowRequestParamsSchemaV1,
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
        summary: 'Archive a maintenance window.',
        tags: ['oas-tag:maintenance-window'],
        availability: {
          since: '9.1.0',
          stability: 'stable',
        },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        licenseState.ensureLicenseForMaintenanceWindow();

        const params: ArchiveMaintenanceWindowRequestParamsV1 = req.params;

        const maintenanceWindowClient = (
          await context.maintenanceWindow
        ).getMaintenanceWindowClient();

        const maintenanceWindow: MaintenanceWindow = await maintenanceWindowClient.archive({
          id: params.id,
          archive: true,
        });

        const response: ArchiveMaintenanceWindowResponseV1 = {
          body: transformInternalMaintenanceWindowToExternalV1(maintenanceWindow),
        };

        return res.ok(response);
      })
    )
  );
};
