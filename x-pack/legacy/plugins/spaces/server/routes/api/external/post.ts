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

export function initPostSpacesApi(deps: ExternalRouteDeps) {
  const { legacyRouter, log, spacesService, savedObjects, routePreCheckLicenseFn } = deps;

  legacyRouter({
    method: 'POST',
    path: '/api/spaces/space',
    async handler(request: ExternalRouteRequestFacade) {
      log.debug(`Inside POST /api/spaces/space`);
      const { SavedObjectsClient } = savedObjects;
      const spacesClient: SpacesClient = await spacesService.scopedClient(request);

      const space = request.payload as Space;

      try {
        log.debug(`Attempting to create space`);
        return await spacesClient.create(space);
      } catch (error) {
        if (SavedObjectsClient.errors.isConflictError(error)) {
          return Boom.conflict(`A space with the identifier ${space.id} already exists.`);
        }
        log.debug(`Error creating space: ${error}`);
        return wrapError(error);
      }
    },
    options: {
      validate: {
        payload: spaceSchema,
      },
      pre: [routePreCheckLicenseFn],
    },
  });
}
