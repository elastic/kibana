/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Space } from '../../../../common/model/space';
import { wrapError } from '../../../lib/errors';
import { SpacesClient } from '../../../lib/spaces_client';
import { ExternalRouteDeps, ExternalRouteRequestFacade } from '.';

export function initGetSpacesApi(deps: ExternalRouteDeps) {
  const { http, log, spacesService, savedObjects, routePreCheckLicenseFn } = deps;

  http.route({
    method: 'GET',
    path: '/api/spaces/space',
    async handler(request: ExternalRouteRequestFacade) {
      log.debug(`Inside GET /api/spaces/space`);

      const spacesClient: SpacesClient = await spacesService.scopedClient(request);

      let spaces: Space[];

      try {
        log.debug(`Attempting to retrieve all spaces`);
        spaces = await spacesClient.getAll();
        log.debug(`Retrieved ${spaces.length} spaces`);
      } catch (error) {
        log.debug(`Error retrieving spaces: ${error}`);
        return wrapError(error);
      }

      return spaces;
    },
    options: {
      pre: [routePreCheckLicenseFn],
    },
  });

  http.route({
    method: 'GET',
    path: '/api/spaces/space/{id}',
    async handler(request: ExternalRouteRequestFacade) {
      const spaceId = request.params.id;

      const { SavedObjectsClient } = savedObjects;
      const spacesClient: SpacesClient = await spacesService.scopedClient(request);

      try {
        return await spacesClient.get(spaceId);
      } catch (error) {
        if (SavedObjectsClient.errors.isNotFoundError(error)) {
          return Boom.notFound();
        }
        return wrapError(error);
      }
    },
    options: {
      pre: [routePreCheckLicenseFn],
    },
  });
}
