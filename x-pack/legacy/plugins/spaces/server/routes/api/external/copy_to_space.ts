/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from '@hapi/joi';
import { Legacy } from 'kibana';
import {
  copySavedObjectsToSpacesFactory,
  resolveCopySavedObjectsToSpacesConflictsFactory,
} from '../../../lib/copy_to_spaces';
import { ExternalRouteDeps } from '.';
import { COPY_TO_SPACES_SAVED_OBJECTS_CLIENT_OPTS } from '../../../lib/copy_to_spaces/copy_to_spaces';
import { SPACE_ID_REGEX } from '../../../lib/space_schema';

interface CopyPayload {
  spaces: string[];
  objects: Array<{ type: string; id: string }>;
  includeReferences: boolean;
  overwrite: boolean;
}

interface ResolveConflictsPayload {
  objects: Array<{ type: string; id: string }>;
  includeReferences: boolean;
  retries: {
    [spaceId: string]: Array<{
      type: string;
      id: string;
      overwrite: boolean;
    }>;
  };
}

export function initCopyToSpacesApi(deps: ExternalRouteDeps) {
  const { legacyRouter, spacesService, savedObjects, routePreCheckLicenseFn } = deps;

  legacyRouter({
    method: 'POST',
    path: '/api/spaces/_copy_saved_objects',
    async handler(request: Legacy.Request, h: Legacy.ResponseToolkit) {
      const savedObjectsClient = savedObjects.getScopedSavedObjectsClient(
        request,
        COPY_TO_SPACES_SAVED_OBJECTS_CLIENT_OPTS
      );

      const copySavedObjectsToSpaces = copySavedObjectsToSpacesFactory(
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
      tags: ['access:copySavedObjectsToSpaces'],
      validate: {
        payload: {
          spaces: Joi.array()
            .items(
              Joi.string().regex(SPACE_ID_REGEX, `lower case, a-z, 0-9, "_", and "-" are allowed`)
            )
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

  legacyRouter({
    method: 'POST',
    path: '/api/spaces/_resolve_copy_saved_objects_errors',
    async handler(request: Legacy.Request, h: Legacy.ResponseToolkit) {
      const savedObjectsClient = savedObjects.getScopedSavedObjectsClient(
        request,
        COPY_TO_SPACES_SAVED_OBJECTS_CLIENT_OPTS
      );

      const resolveCopySavedObjectsToSpacesConflicts = resolveCopySavedObjectsToSpacesConflictsFactory(
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
      tags: ['access:copySavedObjectsToSpaces'],
      validate: {
        payload: Joi.object({
          objects: Joi.array()
            .items(Joi.object({ type: Joi.string(), id: Joi.string() }))
            .required()
            .unique(),
          includeReferences: Joi.bool().default(false),
          retries: Joi.object()
            .pattern(
              SPACE_ID_REGEX,
              Joi.array().items(
                Joi.object({
                  type: Joi.string().required(),
                  id: Joi.string().required(),
                  overwrite: Joi.boolean().default(false),
                })
              )
            )
            .required(),
        }).default(),
      },
      pre: [routePreCheckLicenseFn],
    },
  });
}
