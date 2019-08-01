/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { Legacy } from 'kibana';
import {
  copySavedObjectsToSpacesFactory,
  resolveCopySavedObjectsToSpacesConflictsFactory,
} from '../../../lib/copy_to_spaces';
import { ExternalRouteDeps } from '.';
import { COPY_TO_SPACES_SAVED_OBJECTS_CLIENT_OPTS } from '../../../lib/copy_to_spaces/copy_to_spaces';

interface CopyPayload {
  spaces: string[];
  objects: Array<{ type: string; id: string }>;
  includeReferences: boolean;
  overwrite: boolean;
}

interface ResolveConflictsPayload {
  objects: Array<{ type: string; id: string }>;
  includeReferences: boolean;
  retries: Array<{
    space: string;
    retries: Array<{
      type: string;
      id: string;
      overwrite: boolean;
    }>;
  }>;
}

export function initCopyToSpacesApi(deps: ExternalRouteDeps) {
  const { http, spacesService, savedObjects, routePreCheckLicenseFn } = deps;

  http.route({
    method: 'POST',
    path: '/api/spaces/copySavedObjects',
    async handler(request: Legacy.Request, h: Legacy.ResponseToolkit) {
      const spacesClient = await spacesService.scopedClient(request);

      const savedObjectsClient = savedObjects.getScopedSavedObjectsClient(
        request,
        COPY_TO_SPACES_SAVED_OBJECTS_CLIENT_OPTS
      );

      const copySavedObjectsToSpaces = copySavedObjectsToSpacesFactory(
        spacesClient,
        savedObjectsClient,
        savedObjects
      );

      const {
        spaces: destinationSpaceIds,
        objects,
        includeReferences,
        overwrite,
      } = request.payload as CopyPayload;

      const sourceSpaceId = spacesService.getSpaceId(request);

      const copyResponse = await copySavedObjectsToSpaces(sourceSpaceId, destinationSpaceIds, {
        objects,
        includeReferences,
        overwrite,
      });

      return h.response(copyResponse);
    },
    options: {
      tags: ['access:exportSavedObjects'],
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

  http.route({
    method: 'POST',
    path: '/api/spaces/copySavedObjects/resolveConflicts',
    async handler(request: Legacy.Request, h: Legacy.ResponseToolkit) {
      const spacesClient = await spacesService.scopedClient(request);

      const savedObjectsClient = savedObjects.getScopedSavedObjectsClient(
        request,
        COPY_TO_SPACES_SAVED_OBJECTS_CLIENT_OPTS
      );

      const resolveCopySavedObjectsToSpacesConflicts = resolveCopySavedObjectsToSpacesConflictsFactory(
        spacesClient,
        savedObjectsClient,
        savedObjects
      );

      const { objects, includeReferences, retries } = request.payload as ResolveConflictsPayload;

      const sourceSpaceId = spacesService.getSpaceId(request);

      const resolveConflictsResponse = await resolveCopySavedObjectsToSpacesConflicts(
        sourceSpaceId,
        {
          objects,
          includeReferences,
          retries,
        }
      );

      return h.response(resolveConflictsResponse);
    },
    options: {
      tags: ['access:exportSavedObjects'],
      validate: {
        payload: Joi.object({
          objects: Joi.array()
            .items(Joi.object({ type: Joi.string(), id: Joi.string() }))
            .unique(),
          includeReferences: Joi.bool().default(false),
          retries: Joi.array()
            .items(
              Joi.object({
                space: Joi.string().required(),
                retries: Joi.array().items(
                  Joi.object({
                    type: Joi.string().required(),
                    id: Joi.string().required(),
                    overwrite: Joi.boolean().default(false),
                  })
                ),
              })
            )
            .required(),
        }).default(),
      },
      pre: [routePreCheckLicenseFn],
    },
  });
}
