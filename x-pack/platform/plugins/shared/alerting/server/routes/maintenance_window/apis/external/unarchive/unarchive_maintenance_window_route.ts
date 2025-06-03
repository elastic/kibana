/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { ILicenseState } from '../../../../../lib';
import { verifyAccessAndContext } from '../../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../../types';
import { UNARCHIVE_MAINTENANCE_WINDOW_API_PATH } from '../../../../../types';
import { MAINTENANCE_WINDOW_API_PRIVILEGES } from '../../../../../../common';
import type { MaintenanceWindow } from '../../../../../application/maintenance_window/types';
import type {
  UnarchiveMaintenanceWindowRequestParamsV1,
  UnarchiveMaintenanceWindowResponseV1,
} from '../../../../../../common/routes/maintenance_window/external/apis/unarchive';
import { unarchiveMaintenanceWindowRequestParamsSchemaV1 } from '../../../../../../common/routes/maintenance_window/external/apis/unarchive';
import { maintenanceWindowResponseSchemaV1 } from '../../../../../../common/routes/maintenance_window/external/response';
import { transformInternalMaintenanceWindowToExternalV1 } from '../common/transforms';

export const unarchiveMaintenanceWindowRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: UNARCHIVE_MAINTENANCE_WINDOW_API_PATH,
      validate: {
        request: {
          params: unarchiveMaintenanceWindowRequestParamsSchemaV1,
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
        summary: 'Unarchive a maintenance window.',
        tags: ['oas-tag:maintenance-window'],
        availability: {
          since: '8.19.0',
          stability: 'stable',
        },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        licenseState.ensureLicenseForMaintenanceWindow();

        const params: UnarchiveMaintenanceWindowRequestParamsV1 = req.params;

        const maintenanceWindowClient = (await context.alerting).getMaintenanceWindowClient();

        const maintenanceWindow: MaintenanceWindow = await maintenanceWindowClient.archive({
          id: params.id,
          archive: false,
        });

        const response: UnarchiveMaintenanceWindowResponseV1 = {
          body: transformInternalMaintenanceWindowToExternalV1(maintenanceWindow),
        };

        return res.ok(response);
      })
    )
  );
};
