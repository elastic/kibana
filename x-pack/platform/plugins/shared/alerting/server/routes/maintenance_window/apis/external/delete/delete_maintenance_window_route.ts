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
import { DELETE_MAINTENANCE_WINDOW_API_PATH } from '../../../../../types';
import { MAINTENANCE_WINDOW_API_PRIVILEGES } from '../../../../../../common';

import type { DeleteMaintenanceWindowRequestParamsV1 } from '../../../../../../common/routes/maintenance_window/external/apis/delete';
import { deleteParamsSchemaV1 } from '../../../../../../common/routes/maintenance_window/external/apis/delete';

export const deleteMaintenanceWindowRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.delete(
    {
      path: DELETE_MAINTENANCE_WINDOW_API_PATH,
      validate: {
        request: {
          params: deleteParamsSchemaV1,
        },
        response: {
          204: {
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
        summary: 'Delete a maintenance window.',
        tags: ['oas-tag:maintenance-window'],
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        licenseState.ensureLicenseForMaintenanceWindow();

        const params: DeleteMaintenanceWindowRequestParamsV1 = req.params;

        const maintenanceWindowClient = (await context.alerting).getMaintenanceWindowClient();

        await maintenanceWindowClient.delete({ id: params.id });

        return res.noContent();
      })
    )
  );
};
