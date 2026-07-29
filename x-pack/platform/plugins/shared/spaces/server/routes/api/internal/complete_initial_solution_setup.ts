/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import type { InitialSolutionSetupRouteDeps } from '.';
import type { CompleteInitialSolutionSetupResponse } from '../../../../common';
import { wrapError } from '../../../lib/errors';
import { solutionSchema } from '../../../lib/space_schema';
import { createLicensedRouteHandler } from '../../lib';

export function initCompleteInitialSolutionSetupApi({
  router,
  initialSolutionSetup,
}: InitialSolutionSetupRouteDeps) {
  router.post(
    {
      path: '/internal/spaces/_complete_initial_solution_setup',
      security: {
        authz: {
          enabled: false,
          reason:
            'This one-time development route is guarded by the pending setup marker and an optimistic concurrency check',
        },
      },
      validate: {
        body: schema.object({
          solution: solutionSchema,
        }),
      },
    },
    createLicensedRouteHandler(async (_context, request, response) => {
      try {
        await initialSolutionSetup.complete(request.body.solution);
        const body: CompleteInitialSolutionSetupResponse = {
          solution: request.body.solution,
        };
        return response.ok({ body });
      } catch (error) {
        if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
          return response.notFound();
        }
        return response.customError(wrapError(error));
      }
    })
  );
}
