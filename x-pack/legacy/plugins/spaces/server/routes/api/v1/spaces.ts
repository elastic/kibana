/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Space } from '../../../../common/model/space';
import { wrapError } from '../../../lib/errors';
import { SpacesClient } from '../../../lib/spaces_client';
import { addSpaceIdToPath } from '../../../lib/spaces_url_parser';
import { getSpaceById } from '../../lib';
import { InternalRouteDeps } from '.';

export function initInternalSpacesApi(deps: InternalRouteDeps) {
  const { http, config, spacesService, savedObjects, routePreCheckLicenseFn } = deps;

  http.route({
    method: 'POST',
    path: '/api/spaces/v1/space/{id}/select',
    async handler(request: any) {
      const { SavedObjectsClient } = savedObjects;
      const spacesClient: SpacesClient = await spacesService.scopedClient(request);
      const id = request.params.id;

      try {
        const existingSpace: Space | null = await getSpaceById(
          spacesClient,
          id,
          SavedObjectsClient.errors
        );
        if (!existingSpace) {
          return Boom.notFound();
        }

        return {
          location: addSpaceIdToPath(
            config.get('server.basePath'),
            existingSpace.id,
            config.get('server.defaultRoute')
          ),
        };
      } catch (error) {
        return wrapError(error);
      }
    },
    options: {
      pre: [routePreCheckLicenseFn],
    },
  });
}
