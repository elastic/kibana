/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { Legacy } from 'kibana';
import { copySavedObjectsToSpacesFactory } from '../../../lib/copy_to_spaces';
import { ExternalRouteDeps } from '.';

interface CopyPayload {
  spaces: string[];
  objects: Array<{ type: string; id: string }>;
  includeReferences: boolean;
  overwrite: boolean;
}

export function initCopyToSpacesApi(deps: ExternalRouteDeps) {
  const { http, spacesService, savedObjects, routePreCheckLicenseFn } = deps;

  http.route({
    method: 'POST',
    path: '/api/spaces/copySavedObjects',
    async handler(request: Legacy.Request, h: Legacy.ResponseToolkit) {
      const spacesClient = await spacesService.scopedClient(request);

      const savedObjectsClient = request.getSavedObjectsClient();

      const copySavedObjectsToSpaces = copySavedObjectsToSpacesFactory(
        spacesClient,
        savedObjectsClient,
        savedObjects
      );

      const { spaces, objects, includeReferences, overwrite } = request.payload as CopyPayload;

      const copyResponse = await copySavedObjectsToSpaces(spaces, {
        objects,
        includeReferences,
        overwrite,
      });

      return h.response(copyResponse);
    },
    options: {
      validate: {
        payload: {
          spaces: Joi.array()
            .items(Joi.string())
            .unique(),
          objects: Joi.array()
            .items(Joi.object({ type: Joi.string(), id: Joi.string() }))
            .unique(),
          includeReferences: Joi.bool().default(false),
          overwrite: Joi.bool().default(false),
        },
      },
      pre: [routePreCheckLicenseFn],
    },
  });
}
