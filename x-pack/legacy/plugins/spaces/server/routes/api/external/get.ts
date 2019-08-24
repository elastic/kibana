/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import Joi from 'joi';
import { RequestQuery } from 'hapi';
import { GetSpacePurpose } from '../../../../common/model/types';
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

      const purpose: GetSpacePurpose = (request.query as RequestQuery).purpose as GetSpacePurpose;

      const spacesClient: SpacesClient = await spacesService.scopedClient(request);

      let spaces: Space[];

      try {
        log.debug(`Attempting to retrieve all spaces for ${purpose} purpose`);
        spaces = await spacesClient.getAll(purpose);
        log.debug(`Retrieved ${spaces.length} spaces for ${purpose} purpose`);
      } catch (error) {
        log.debug(`Error retrieving spaces for ${purpose} purpose: ${error}`);
        return wrapError(error);
      }

      return spaces;
    },
    options: {
      pre: [routePreCheckLicenseFn],
      validate: {
        query: Joi.object().keys({
          purpose: Joi.string()
            .valid('any', 'copySavedObjectsIntoSpace')
            .default('any'),
        }),
      },
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
