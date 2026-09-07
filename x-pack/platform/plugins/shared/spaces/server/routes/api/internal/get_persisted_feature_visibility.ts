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

interface PersistedFeatureVisibilityResponseBody {
  featureVisibility: { disabledFeatures: string[] };
}

export function initGetPersistedFeatureVisibilityApi(deps: InternalRouteDeps) {
  const { router, getSpacesService } = deps;

  router.get(
    {
      path: '/internal/spaces/space/{id}/persisted_feature_visibility',
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
    createLicensedRouteHandler(async (_context, request, response) => {
      const spaceId = request.params.id;

      try {
        const spacesClient = getSpacesService().createSpacesClient(request);
        const disabledFeatures = await spacesClient.getPersistedFeatureVisibility(spaceId);

        const body: PersistedFeatureVisibilityResponseBody = {
          featureVisibility: { disabledFeatures },
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
