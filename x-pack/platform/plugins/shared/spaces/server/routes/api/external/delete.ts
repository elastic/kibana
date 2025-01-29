/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import { schema } from '@kbn/config-schema';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import type { ExternalRouteDeps } from '.';
import { API_VERSIONS } from '../../../../common';
import { wrapError } from '../../../lib/errors';
import { createLicensedRouteHandler } from '../../lib';

export function initDeleteSpacesApi(deps: ExternalRouteDeps) {
  const { router, log, getSpacesService } = deps;

  router.versioned
    .delete({
      path: '/api/spaces/space/{id}',
      access: 'public',
      summary: `Delete a space`,
      description: `When you delete a space, all saved objects that belong to the space are automatically deleted, which is permanent and cannot be undone.`,
      options: {
        tags: ['oas-tag:spaces'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        security: {
          authz: {
            enabled: false,
            reason:
              'This route delegates authorization to the spaces service via a scoped spaces client',
          },
        },
        validate: {
          request: {
            params: schema.object({
              id: schema.string({
                meta: { description: 'The space identifier.' },
              }),
            }),
          },
          response: {
            204: {
              description: 'Indicates a successful call.',
            },
            404: {
              description: 'Indicates that the request failed.',
            },
          },
        },
      },
      createLicensedRouteHandler(async (context, request, response) => {
        const spacesClient = getSpacesService().createSpacesClient(request);

        const id = request.params.id;

        try {
          await spacesClient.delete(id);
        } catch (error) {
          if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
            return response.notFound();
          } else if (SavedObjectsErrorHelpers.isEsCannotExecuteScriptError(error)) {
            log.error(
              `Failed to delete space '${id}', cannot execute script in Elasticsearch query: ${error.message}`
            );
            return response.customError(
              wrapError(Boom.badRequest('Cannot execute script in Elasticsearch query'))
            );
          }
          return response.customError(wrapError(error));
        }

        return response.noContent();
      })
    );
}
