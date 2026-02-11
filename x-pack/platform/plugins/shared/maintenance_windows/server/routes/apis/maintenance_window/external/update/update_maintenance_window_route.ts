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
import {
  MAINTENANCE_WINDOW_API_PRIVILEGES,
  UPDATE_MAINTENANCE_WINDOW_API_PATH,
} from '../../../../../../common';
import type { MaintenanceWindow } from '../../../../../application/types';
import type {
  UpdateMaintenanceWindowRequestBodyV1,
  UpdateMaintenanceWindowResponseV1,
  UpdateMaintenanceWindowRequestParamsV1,
} from '../../../../schemas/maintenance_window/external/request/update';
import {
  updateMaintenanceWindowRequestBodySchemaV1,
  updateMaintenanceWindowRequestParamsSchemaV1,
} from '../../../../schemas/maintenance_window/external/request/update';
import { maintenanceWindowResponseSchemaV1 } from '../../../../schemas/maintenance_window/external/response';
import { transformInternalMaintenanceWindowToExternalV1 } from '../common/transforms';
import { getDurationInMilliseconds } from '../../../../../lib/transforms/custom_to_rrule/util';

import { transformUpdateBodyV1 } from './transform_update_body';

export const updateMaintenanceWindowRoute = (
  router: IRouter<MaintenanceWindowRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.patch(
    {
      path: UPDATE_MAINTENANCE_WINDOW_API_PATH,
      validate: {
        request: {
          body: updateMaintenanceWindowRequestBodySchemaV1,
          params: updateMaintenanceWindowRequestParamsSchemaV1,
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
          409: {
            description:
              'Indicates that the maintenance window has already been updated by another user.',
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
        summary: 'Update a maintenance window.',
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

        const body: UpdateMaintenanceWindowRequestBodyV1 = req.body;
        const params: UpdateMaintenanceWindowRequestParamsV1 = req.params;
        const customSchedule = body?.schedule?.custom;

        const maintenanceWindowClient = (
          await context.maintenanceWindow
        ).getMaintenanceWindowClient();

        const maintenanceWindow: MaintenanceWindow = await maintenanceWindowClient.update({
          id: params.id,
          data: transformUpdateBodyV1(body),
        });

        const response: UpdateMaintenanceWindowResponseV1 =
          transformInternalMaintenanceWindowToExternalV1(maintenanceWindow);

        // Return request duration in response when both are same otherwise throw an error
        const requestDurationInMilliseconds = customSchedule?.duration
          ? getDurationInMilliseconds(customSchedule.duration)
          : undefined;

        const responseDurationInMilliseconds = getDurationInMilliseconds(
          response.schedule.custom.duration
        );

        if (
          requestDurationInMilliseconds &&
          requestDurationInMilliseconds !== responseDurationInMilliseconds
        ) {
          throw new Error('Request duration does not match response duration.');
        }

        const responseDuration = customSchedule?.duration
          ? customSchedule.duration
          : response.schedule.custom.duration;

        return res.ok({
          body: {
            ...response,
            schedule: {
              custom: {
                ...response.schedule.custom,
                ...{
                  duration: responseDuration,
                },
              },
            },
          },
        });
      })
    )
  );
};
