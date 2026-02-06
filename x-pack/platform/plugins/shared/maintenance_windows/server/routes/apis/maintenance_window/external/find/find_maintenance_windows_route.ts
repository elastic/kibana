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
  FIND_MAINTENANCE_WINDOWS_API_PATH,
  MAINTENANCE_WINDOW_API_PRIVILEGES,
} from '../../../../../../common';
import type { FindMaintenanceWindowsResult } from '../../../../../application/methods/find/types';
import type { FindMaintenanceWindowsResponseV1 } from '../../../../schemas/maintenance_window/external/request/find';
import type { FindMaintenanceWindowsQueryV1 } from '../../../../schemas/maintenance_window/external/request/find';
import {
  findMaintenanceWindowsQuerySchemaV1,
  findMaintenanceWindowsResponseSchemaV1,
} from '../../../../schemas/maintenance_window/external/request/find';
import {
  transformFindMaintenanceWindowParamsV1,
  transformFindMaintenanceWindowResponseV1,
} from './transforms';

export const findMaintenanceWindowsRoute = (
  router: IRouter<MaintenanceWindowRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: FIND_MAINTENANCE_WINDOWS_API_PATH,
      validate: {
        request: {
          query: findMaintenanceWindowsQuerySchemaV1,
        },
        response: {
          200: {
            body: () => findMaintenanceWindowsResponseSchemaV1,
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
          requiredPrivileges: [`${MAINTENANCE_WINDOW_API_PRIVILEGES.READ_MAINTENANCE_WINDOW}`],
        },
      },
      options: {
        access: 'public',
        summary: 'Search for a maintenance window.',
        tags: ['oas-tag:maintenance-window'],
        availability: {
          since: '9.2.0',
          stability: 'stable',
        },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        licenseState.ensureLicenseForMaintenanceWindow();

        const query: FindMaintenanceWindowsQueryV1 = req.query || {};
        const maintenanceWindowClient = (
          await context.maintenanceWindow
        ).getMaintenanceWindowClient();

        const options = transformFindMaintenanceWindowParamsV1(query);
        const findResult: FindMaintenanceWindowsResult = await maintenanceWindowClient.find(
          options
        );
        const responseBody: FindMaintenanceWindowsResponseV1 =
          transformFindMaintenanceWindowResponseV1(findResult);

        return res.ok({ body: responseBody });
      })
    )
  );
};
