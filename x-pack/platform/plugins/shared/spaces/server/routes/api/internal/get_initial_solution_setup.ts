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
  initialSolutionSetup,
}: InitialSolutionSetupRouteDeps) {
  router.get(
    {
      path: '/internal/spaces/_initial_solution_setup',
      security: {
        authz: {
          enabled: false,
          reason: 'This route only reports whether the one-time development setup is pending',
        },
      },
      validate: false,
    },
    createLicensedRouteHandler(async (_context, _request, response) => {
      try {
        const body: GetInitialSolutionSetupResponse = {
          required: await initialSolutionSetup.isRequired(),
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
