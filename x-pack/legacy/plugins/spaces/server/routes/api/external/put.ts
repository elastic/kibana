/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Space } from '../../../../common/model/space';
import { wrapError } from '../../../lib/errors';
import { spaceSchema } from '../../../lib/space_schema';
import { SpacesClient } from '../../../lib/spaces_client';
import { ExternalRouteDeps, ExternalRouteRequestFacade } from '.';

export function initPutSpacesApi(deps: ExternalRouteDeps) {
  const { legacyRouter, spacesService, savedObjects, routePreCheckLicenseFn } = deps;

  legacyRouter({
    method: 'PUT',
    path: '/api/spaces/space/{id}',
    async handler(request: ExternalRouteRequestFacade) {
      const { SavedObjectsClient } = savedObjects;
      const spacesClient: SpacesClient = await spacesService.scopedClient(request);

      const space: Space = request.payload as Space;
      const id = request.params.id;

      let result: Space;
      try {
        result = await spacesClient.update(id, { ...space });
      } catch (error) {
        if (SavedObjectsClient.errors.isNotFoundError(error)) {
          return Boom.notFound();
        }
        return wrapError(error);
      }

      return result;
    },
    options: {
      validate: {
        payload: spaceSchema,
      },
      pre: [routePreCheckLicenseFn],
    },
  });
}
