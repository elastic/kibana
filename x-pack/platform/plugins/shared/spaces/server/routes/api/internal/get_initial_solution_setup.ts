/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InitialSolutionSetupRouteDeps } from '.';
import type { GetInitialSolutionSetupResponse } from '../../../../common';
import { wrapError } from '../../../lib/errors';
import { createLicensedRouteHandler } from '../../lib';

export function initGetInitialSolutionSetupApi({
  router,
  getSpacesService,
  initialSolutionSetup,
}: InitialSolutionSetupRouteDeps) {
  router.get(
    {
      path: '/internal/spaces/_initial_solution_setup',
      security: {
        authz: {
          requiredPrivileges: ['manage_spaces'],
        },
      },
      validate: false,
    },
    createLicensedRouteHandler(async (_context, request, response) => {
      try {
        const spacesClient = getSpacesService().createSpacesClient(request);
        const body: GetInitialSolutionSetupResponse = {
          required: await initialSolutionSetup.isRequired(spacesClient),
        };
        return response.ok({
          body,
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    })
  );
}
