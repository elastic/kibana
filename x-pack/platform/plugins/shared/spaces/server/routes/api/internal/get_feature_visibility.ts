/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import type { InternalRouteDeps } from '.';
import { wrapError } from '../../../lib/errors';
import { createLicensedRouteHandler } from '../../lib';

interface FeatureVisibilityResponseBody {
  featureVisibility: { disabledFeatures: string[] };
}

export function initGetFeatureVisibilityApi(deps: InternalRouteDeps) {
  const { router, getSpacesService } = deps;

  router.get(
    {
      path: '/internal/spaces/space/{id}/feature_visibility',
      security: {
        authz: {
          enabled: false,
          reason:
            'This route delegates authorization to the spaces service via a scoped spaces client',
        },
      },
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      const spaceId = request.params.id;

      try {
        // Authorization + existence check
        const spacesClient = getSpacesService().createSpacesClient(request);
        await spacesClient.get(spaceId);

        // Fetch stored classic feature visibility directly from the space saved object
        const { getClient } = (await context.core).savedObjects;
        const client = getClient({ includedHiddenTypes: ['space'] });

        const spaceSavedObject = await client.get<{ disabledFeatures?: string[] }>(
          'space',
          spaceId
        );

        const body: FeatureVisibilityResponseBody = {
          featureVisibility: {
            disabledFeatures: spaceSavedObject.attributes.disabledFeatures ?? [],
          },
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
