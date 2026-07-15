/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { ExternalRouteDeps } from '.';
import { API_VERSIONS, type Space } from '../../../../common';
import { wrapError } from '../../../lib/errors';
import { createLicensedRouteHandler } from '../../lib';

export function initGetAllSpacesApi(deps: ExternalRouteDeps) {
  const { router, log, getSpacesService } = deps;

  router.versioned
    .get({
      path: '/api/spaces/space',
      access: 'public',
      summary: `Get all spaces`,
      description:
        'Retrieve all available Kibana spaces. The list includes only the spaces that the user is authorized to access.',
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
        validate: {
          request: {
            query: schema.object(
              {
                purpose: schema.maybe(
                  schema.oneOf(
                    [
                      schema.literal('any'),
                      schema.literal('copySavedObjectsIntoSpace'),
                      schema.literal('shareSavedObjectsIntoSpace'),
                    ],
                    {
                      meta: {
                        description:
                          'Specifies which authorization checks are applied to the API call. The default value is `any`.',
                      },
                    }
                  )
                ),
                include_authorized_purposes: schema.maybe(
                  schema.boolean({
                    meta: {
                      description:
                        'When enabled, the API returns any spaces the user is authorized to access in any capacity, each including the purposes for which the user is authorized. This is useful for identifying spaces the user can read but is not authorized for a given purpose. Without the security plugin, this parameter has no effect, because no authorization checks are performed. This parameter cannot be used together with the `purpose` parameter.',
                    },
                  })
                ),
              },
              {
                validate: (value) => {
                  if (
                    value.purpose &&
                    value.include_authorized_purposes !== undefined &&
                    value.include_authorized_purposes !== false
                  ) {
                    return 'include_authorized_purposes can only be false when purpose is specified';
                  }
                },
              }
            ),
          },
          response: {
            200: {
              description: 'Indicates a successful call.',
            },
          },
        },
      },
      createLicensedRouteHandler(async (context, request, response) => {
        log.debug(`Inside GET /api/spaces/space`);

        const { purpose, include_authorized_purposes: includeAuthorizedPurposes } = request.query;

        const spacesClient = getSpacesService().createSpacesClient(request);

        let spaces: Space[];

        try {
          log.debug(
            `Attempting to retrieve all spaces for ${purpose} purpose with includeAuthorizedPurposes=${includeAuthorizedPurposes}`
          );
          spaces = await spacesClient.getAll({ purpose, includeAuthorizedPurposes });
          log.debug(
            `Retrieved ${spaces.length} spaces for ${purpose} purpose with includeAuthorizedPurposes=${includeAuthorizedPurposes}`
          );
        } catch (error) {
          log.debug(
            `Error retrieving spaces for ${purpose} purpose with includeAuthorizedPurposes=${includeAuthorizedPurposes}: ${error}`
          );
          return response.customError(wrapError(error));
        }

        return response.ok({ body: spaces });
      })
    );
}
