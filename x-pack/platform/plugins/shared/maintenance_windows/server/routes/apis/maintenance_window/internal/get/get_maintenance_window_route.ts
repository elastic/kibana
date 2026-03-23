/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { ILicenseState } from '../../../../../lib/license_state';
import { verifyAccessAndContext } from '../../../../lib/verify_access_and_context';
import type { MaintenanceWindowRequestHandlerContext } from '../../../../../types';
import { INTERNAL_ALERTING_API_MAINTENANCE_WINDOW_PATH } from '../../../../../../common';
import { MAINTENANCE_WINDOW_API_PRIVILEGES } from '../../../../../../common';
import type { MaintenanceWindow } from '../../../../../application/types';
import type {
  GetMaintenanceWindowRequestParamsV1,
  GetMaintenanceWindowResponseV1,
} from '../../../../schemas/maintenance_window/internal/request/get';
import { getParamsSchemaV1 } from '../../../../schemas/maintenance_window/internal/request/get';
import { transformInternalMaintenanceWindowToExternalV1 } from '../transforms';

export const getMaintenanceWindowRoute = (
  router: IRouter<MaintenanceWindowRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_ALERTING_API_MAINTENANCE_WINDOW_PATH}/{id}`,
      validate: {
        params: getParamsSchemaV1,
      },
      security: {
        authz: {
          requiredPrivileges: [`${MAINTENANCE_WINDOW_API_PRIVILEGES.READ_MAINTENANCE_WINDOW}`],
        },
      },
      options: {
        access: 'internal',
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        licenseState.ensureLicenseForMaintenanceWindow();

        const maintenanceWindowClient = (
          await context.maintenanceWindow
        ).getMaintenanceWindowClient();

        const params: GetMaintenanceWindowRequestParamsV1 = req.params;

        const maintenanceWindow: MaintenanceWindow = await maintenanceWindowClient.get({
          id: params.id,
        });

        const response: GetMaintenanceWindowResponseV1 = {
          body: transformInternalMaintenanceWindowToExternalV1(maintenanceWindow),
        };
        return res.ok(response);
      })
    )
  );
};
