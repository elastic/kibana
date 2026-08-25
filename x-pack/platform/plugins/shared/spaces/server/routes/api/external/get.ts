/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import type { ExternalRouteDeps } from '.';
import { getSpaceExamples } from './examples';
import { API_VERSIONS } from '../../../../common';
import { wrapError } from '../../../lib/errors';
import { getSpaceSchema } from '../../../lib/space_schema';
import { createLicensedRouteHandler } from '../../lib';

export function initGetSpaceApi(deps: ExternalRouteDeps) {
  const { router, getSpacesService, isServerless } = deps;

  router.versioned
    .get({
      path: '/api/spaces/space/{id}',
      access: 'public',
      summary: `Get a space`,
      description: 'Retrieve a single Kibana space by its identifier.',
      options: {
        tags: ['oas-tag:spaces'],
      },
      security: {
        authz: {
          enabled: false,
          reason:
            'This route delegates authorization to the spaces service via a scoped spaces client',
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        options: {
          oasOperationObject: getSpaceExamples,
        },
        validate: {
          request: {
            params: schema.object({
              id: schema.string({ meta: { description: 'The space identifier.' } }),
            }),
          },
          response: {
            200: {
              body: () => getSpaceSchema(isServerless),
              description: 'Indicates a successful call.',
            },
          },
        },
      },
      createLicensedRouteHandler(async (context, request, response) => {
        const spaceId = request.params.id;
        const spacesClient = getSpacesService().createSpacesClient(request);
        try {
          const space = await spacesClient.get(spaceId);
          return response.ok({
            body: space,
          });
        } catch (error) {
          if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
            return response.notFound();
          }
          return response.customError(wrapError(error));
        }
      })
    );
}
