/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, RequestHandlerContext } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { KibanaResponseFactory } from '@kbn/core/server';
import {
  findSavedAppsQuerySchema,
  savedAppIdParamsSchema,
  savedAppInputSchema,
} from '../../common/saved_app_schema';
import { createSavedAppsService, type SavedAppsService } from './saved_apps_service';

const API_PATH = '/internal/custom_app/apps';
const API_VERSION = '1';

// Authorization is the saved objects client's: it acts for the user, and the privileges for the
// type come from the feature that this plugin registers.
const AUTHZ_OPT_OUT = {
  authz: {
    enabled: false,
    reason:
      'This route is opted out from authorization because authorization is provided by the saved objects client.',
  },
} as const;

const getService = async (context: RequestHandlerContext): Promise<SavedAppsService> =>
  createSavedAppsService((await context.core).savedObjects.client);

/** The status of a failure of the saved objects client: 404, 403, 409 and so on. */
const toErrorResponse = (error: unknown, response: KibanaResponseFactory) => {
  if (SavedObjectsErrorHelpers.isNotFoundError(error as Error)) {
    return response.notFound();
  }
  if (SavedObjectsErrorHelpers.isForbiddenError(error as Error)) {
    return response.forbidden();
  }
  if (SavedObjectsErrorHelpers.isConflictError(error as Error)) {
    return response.conflict();
  }
  if (SavedObjectsErrorHelpers.isBadRequestError(error as Error)) {
    return response.badRequest({ body: { message: (error as Error).message } });
  }
  throw error;
};

export const registerSavedAppRoutes = (router: IRouter) => {
  router.versioned
    .get({ path: API_PATH, access: 'internal', security: AUTHZ_OPT_OUT })
    .addVersion(
      { version: API_VERSION, validate: { request: { query: findSavedAppsQuerySchema } } },
      async (context, request, response) => {
        try {
          return response.ok({ body: await (await getService(context)).find(request.query) });
        } catch (error) {
          return toErrorResponse(error, response);
        }
      }
    );

  router.versioned
    .get({ path: `${API_PATH}/{id}`, access: 'internal', security: AUTHZ_OPT_OUT })
    .addVersion(
      { version: API_VERSION, validate: { request: { params: savedAppIdParamsSchema } } },
      async (context, request, response) => {
        try {
          return response.ok({ body: await (await getService(context)).get(request.params.id) });
        } catch (error) {
          return toErrorResponse(error, response);
        }
      }
    );

  router.versioned
    .post({ path: API_PATH, access: 'internal', security: AUTHZ_OPT_OUT })
    .addVersion(
      { version: API_VERSION, validate: { request: { body: savedAppInputSchema } } },
      async (context, request, response) => {
        try {
          return response.ok({ body: await (await getService(context)).create(request.body) });
        } catch (error) {
          return toErrorResponse(error, response);
        }
      }
    );

  router.versioned
    .put({ path: `${API_PATH}/{id}`, access: 'internal', security: AUTHZ_OPT_OUT })
    .addVersion(
      {
        version: API_VERSION,
        validate: { request: { params: savedAppIdParamsSchema, body: savedAppInputSchema } },
      },
      async (context, request, response) => {
        try {
          return response.ok({
            body: await (await getService(context)).update(request.params.id, request.body),
          });
        } catch (error) {
          return toErrorResponse(error, response);
        }
      }
    );

  router.versioned
    .delete({ path: `${API_PATH}/{id}`, access: 'internal', security: AUTHZ_OPT_OUT })
    .addVersion(
      { version: API_VERSION, validate: { request: { params: savedAppIdParamsSchema } } },
      async (context, request, response) => {
        try {
          await (await getService(context)).remove(request.params.id);
          return response.ok({ body: { id: request.params.id } });
        } catch (error) {
          return toErrorResponse(error, response);
        }
      }
    );
};
