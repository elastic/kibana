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
import { MAINTENANCE_WINDOW_API_PRIVILEGES } from '../../../../../../common';
import type { MaintenanceWindow } from '../../../../../application/types';
import { CREATE_MAINTENANCE_WINDOW_API_PATH } from '../../../../../../common';
import type {
  CreateMaintenanceWindowRequestBodyV1,
  CreateMaintenanceWindowResponseV1,
} from '../../../../schemas/maintenance_window/external/request/create';
import { createMaintenanceWindowRequestBodySchemaV1 } from '../../../../schemas/maintenance_window/external/request/create';
import { maintenanceWindowResponseSchemaV1 } from '../../../../schemas/maintenance_window/external/response';
import { getDurationInMilliseconds } from '../../../../../lib/transforms/custom_to_rrule/util';
import { transformInternalMaintenanceWindowToExternalV1 } from '../common/transforms';
import { transformCreateBodyV1 } from './transform_create_body';

export const createMaintenanceWindowRoute = (
  router: IRouter<MaintenanceWindowRequestHandlerContext>,
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
          since: '9.1.0',
          stability: 'stable',
        },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        licenseState.ensureLicenseForMaintenanceWindow();

        const body: CreateMaintenanceWindowRequestBodyV1 = req.body;
        const customSchedule = body.schedule.custom;

        const maintenanceWindowClient = (
          await context.maintenanceWindow
        ).getMaintenanceWindowClient();

        const maintenanceWindow: MaintenanceWindow = await maintenanceWindowClient.create({
          data: transformCreateBodyV1(body),
        });

        const response: CreateMaintenanceWindowResponseV1 =
          transformInternalMaintenanceWindowToExternalV1(maintenanceWindow);
        // Return request duration in response when both are same otherwise throw an error
        const requestDurationInMilliseconds = getDurationInMilliseconds(customSchedule.duration);

        const responseDurationInMilliseconds = getDurationInMilliseconds(
          response.schedule.custom.duration
        );

        if (requestDurationInMilliseconds !== responseDurationInMilliseconds) {
          throw new Error('Request duration does not match response duration.');
        }

        return res.ok({
          body: {
            ...response,
            schedule: {
              custom: { ...response.schedule.custom, duration: customSchedule.duration },
            },
          },
        });
      })
    )
  );
};
