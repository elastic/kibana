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
import { CREATE_MAINTENANCE_WINDOW_API_PATH } from '../../../../../types';
import { MAINTENANCE_WINDOW_API_PRIVILEGES } from '../../../../../../common';
import type { MaintenanceWindow } from '../../../../../application/maintenance_window/types';
import type {
  CreateMaintenanceWindowRequestBodyV1,
  CreateMaintenanceWindowResponseV1,
} from '../../../../../../common/routes/maintenance_window/external/apis/create';
import { createMaintenanceWindowRequestBodySchemaV1 } from '../../../../../../common/routes/maintenance_window/external/apis/create';
import { maintenanceWindowResponseSchemaV1 } from '../../../../../../common/routes/maintenance_window/external/response';
import { transformInternalMaintenanceWindowToExternalV1 } from '../common/transforms';
import { transformCreateBodyV1 } from './transform_create_body';

export const createMaintenanceWindowRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: CREATE_MAINTENANCE_WINDOW_API_PATH,
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

        const body: CreateMaintenanceWindowRequestBodyV1 = req.body;

        const maintenanceWindowClient = (await context.alerting).getMaintenanceWindowClient();

        const maintenanceWindow: MaintenanceWindow = await maintenanceWindowClient.create({
          data: transformCreateBodyV1(body),
        });

        const response: CreateMaintenanceWindowResponseV1 =
          transformInternalMaintenanceWindowToExternalV1(maintenanceWindow);

        return res.ok({
          body: response,
        });
      })
    )
  );
};
