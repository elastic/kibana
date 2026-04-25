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
import { INTERNAL_ALERTING_API_GET_ACTIVE_MAINTENANCE_WINDOWS_PATH } from '../../../../../../common';
import { MAINTENANCE_WINDOW_API_PRIVILEGES } from '../../../../../../common';

import type { MaintenanceWindow } from '../../../../../application/types';
import type { GetActiveMaintenanceWindowsResponseV1 } from '../../../../schemas/maintenance_window/internal/request/get_active';
import { transformInternalMaintenanceWindowToExternalV1 } from '../transforms';

export const getActiveMaintenanceWindowsRoute = (
  router: IRouter<MaintenanceWindowRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: INTERNAL_ALERTING_API_GET_ACTIVE_MAINTENANCE_WINDOWS_PATH,
      validate: {},
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
        // We do not want to throw for this route because other solutions
        // will be using it to determine whether or not they should
        // display a callout in their rules list.
        try {
          licenseState.ensureLicenseForMaintenanceWindow();
        } catch (e) {
          return res.ok({
            body: [],
          });
        }
        const maintenanceWindowClient = (
          await context.maintenanceWindow
        ).getMaintenanceWindowClient();
        const maintenanceWindows: MaintenanceWindow[] =
          await maintenanceWindowClient.getActiveMaintenanceWindows();

        const response: GetActiveMaintenanceWindowsResponseV1 = {
          body: maintenanceWindows.map((maintenanceWindow) =>
            transformInternalMaintenanceWindowToExternalV1(maintenanceWindow)
          ),
        };

        return res.ok(response);
      })
    )
  );
};
