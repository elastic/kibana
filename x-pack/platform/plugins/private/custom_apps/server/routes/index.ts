/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup } from '@kbn/core/server';
import { API_BASE_PATH, CUSTOM_APP_SAVED_OBJECT_TYPE } from '../../common/constants';
import {
  createCustomApp,
  InvalidCustomAppError,
  listCustomApps,
  toCustomApp,
  updateCustomApp,
} from '../custom_app_service';
import type { CustomAppAttributes } from '../custom_app_service';

/**
 * `schema.object` keeps the route contract honest at the HTTP boundary; the
 * definition itself is validated in the service, which is also what the Agent
 * Builder tool goes through.
 */
const definitionBody = schema.object({}, { unknowns: 'allow' });

/**
 * The saved objects client already enforces per-type privileges for the
 * authenticated user, so these routes delegate rather than declaring a second,
 * divergent set.
 */
const security = {
  authz: {
    enabled: false as const,
    reason:
      'Authorization is enforced by the saved objects client, which checks privileges for the custom_app type.',
  },
};

export function registerRoutes(core: CoreSetup) {
  const router = core.http.createRouter();
  const access = 'internal' as const;

  router.get(
    { path: API_BASE_PATH, validate: false, security, options: { access } },
    async (context, request, response) => {
      const client = (await context.core).savedObjects.client;
      return response.ok({ body: { items: await listCustomApps(client) } });
    }
  );

  router.get(
    {
      path: `${API_BASE_PATH}/{id}`,
      validate: { params: schema.object({ id: schema.string() }) },
      security,
      options: { access },
    },
    async (context, request, response) => {
      const client = (await context.core).savedObjects.client;
      const object = await client.get<CustomAppAttributes>(
        CUSTOM_APP_SAVED_OBJECT_TYPE,
        request.params.id
      );
      return response.ok({ body: toCustomApp(object) });
    }
  );

  router.post(
    { path: API_BASE_PATH, validate: { body: definitionBody }, security, options: { access } },
    async (context, request, response) => {
      const client = (await context.core).savedObjects.client;
      try {
        return response.ok({ body: await createCustomApp(client, request.body) });
      } catch (error) {
        if (error instanceof InvalidCustomAppError) {
          return response.badRequest({ body: { message: error.message } });
        }
        throw error;
      }
    }
  );

  router.put(
    {
      path: `${API_BASE_PATH}/{id}`,
      validate: { params: schema.object({ id: schema.string() }), body: definitionBody },
      security,
      options: { access },
    },
    async (context, request, response) => {
      const client = (await context.core).savedObjects.client;
      try {
        return response.ok({
          body: await updateCustomApp(client, request.params.id, request.body),
        });
      } catch (error) {
        if (error instanceof InvalidCustomAppError) {
          return response.badRequest({ body: { message: error.message } });
        }
        throw error;
      }
    }
  );

  router.delete(
    {
      path: `${API_BASE_PATH}/{id}`,
      validate: { params: schema.object({ id: schema.string() }) },
      security,
      options: { access },
    },
    async (context, request, response) => {
      const client = (await context.core).savedObjects.client;
      await client.delete(CUSTOM_APP_SAVED_OBJECT_TYPE, request.params.id);
      return response.ok({ body: { deleted: true } });
    }
  );
}
