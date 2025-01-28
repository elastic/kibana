/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import type { InternalRouteDeps } from '.';
import type { SolutionView, Space } from '../../../../common';
import { wrapError } from '../../../lib/errors';
import { solutionSchema } from '../../../lib/space_schema';
import { createLicensedRouteHandler, parseCloudSolution } from '../../lib';

const spaceSolutionSchema = schema.oneOf([
  schema.object({ solution: solutionSchema }),
  schema.object({
    solution_type: schema.oneOf([
      schema.literal('security'),
      schema.literal('observability'),
      schema.literal('elasticsearch'),
      schema.literal('search'),
    ]),
  }),
]);

/* FUTURE Engineer
 * This route /internal/spaces/space/{id}/solution is and will be used by cloud (control panel)
 * to set the solution of a default space for an instant deployment
 * and it will use the parameter "solution_type"
 */

export function initSetSolutionSpaceApi(deps: InternalRouteDeps) {
  const { router, getSpacesService } = deps;

  router.put(
    {
      path: '/internal/spaces/space/{id}/solution',
      security: {
        authz: {
          enabled: false,
          reason:
            'This route delegates authorization to the spaces service via a scoped spaces client',
        },
      },
      options: {
        description: `Update solution for a space`,
      },
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: spaceSolutionSchema,
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      const spacesClient = (await getSpacesService()).createSpacesClient(request);
      const id = request.params.id;
      let solutionToUpdate: SolutionView | undefined;

      let result: Space;
      try {
        if ('solution' in request.body) {
          solutionToUpdate = request.body.solution;
        } else {
          solutionToUpdate = parseCloudSolution(request.body.solution_type);
        }
        const space = await spacesClient?.get(id);
        result = await spacesClient.update(id, { ...space, solution: solutionToUpdate });
      } catch (error) {
        if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
          return response.notFound();
        }
        return response.customError(wrapError(error));
      }

      return response.ok({ body: result });
    })
  );
}
