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
import type { BulkGetMaintenanceWindowsResult } from '../../../../../application/methods/bulk_get/types';
import type {
  BulkGetMaintenanceWindowsRequestBodyV1,
  BulkGetMaintenanceWindowsResponseV1,
} from '../../../../schemas/maintenance_window/internal/request/bulk_get';
import { bulkGetBodySchemaV1 } from '../../../../schemas/maintenance_window/internal/request/bulk_get';
import { transformBulkGetResultToResponseV1 } from './transforms';

export const bulkGetMaintenanceWindowRoute = (
  router: IRouter<MaintenanceWindowRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${INTERNAL_ALERTING_API_MAINTENANCE_WINDOW_PATH}/_bulk_get`,
      validate: {
        body: bulkGetBodySchemaV1,
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

        const body: BulkGetMaintenanceWindowsRequestBodyV1 = req.body;

        const maintenanceWindowClient = (
          await context.maintenanceWindow
        ).getMaintenanceWindowClient();

        const result: BulkGetMaintenanceWindowsResult = await maintenanceWindowClient.bulkGet({
          ids: body.ids,
        });

        const response: BulkGetMaintenanceWindowsResponseV1 = {
          body: transformBulkGetResultToResponseV1(result),
        };

        return res.ok(response);
      })
    )
  );
};
