/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, SavedObject } from '@kbn/core/server';
import { customAppDefinitionSchema } from '../../common/app_definition';
import type { CustomAppDefinition } from '../../common/app_definition';
import { API_BASE_PATH, CUSTOM_APP_SAVED_OBJECT_TYPE } from '../../common/constants';

interface CustomAppAttributes {
  title: string;
  description?: string;
  appJSON: string;
}

function toResponse(object: SavedObject<CustomAppAttributes>) {
  return {
    id: object.id,
    updatedAt: object.updated_at,
    definition: JSON.parse(object.attributes.appJSON) as CustomAppDefinition,
  };
}

function toAttributes(definition: CustomAppDefinition): CustomAppAttributes {
  return {
    title: definition.title,
    description: definition.description,
    appJSON: JSON.stringify(definition),
  };
}

/**
 * The body is validated twice on write: `schema.object` at the HTTP boundary to
 * keep the route contract honest, then the zod definition schema to reject a
 * malformed app before it reaches storage. The second is what protects us from
 * an agent writing something the renderer cannot load.
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
    {
      path: API_BASE_PATH,
      validate: false,
      security,
      options: { access },
    },
    async (context, request, response) => {
      const client = (await context.core).savedObjects.client;
      const found = await client.find<CustomAppAttributes>({
        type: CUSTOM_APP_SAVED_OBJECT_TYPE,
        perPage: 200,
      });
      return response.ok({
        body: {
          items: found.saved_objects.map((object) => ({
            id: object.id,
            title: object.attributes.title,
            description: object.attributes.description,
            updatedAt: object.updated_at,
          })),
        },
      });
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
      return response.ok({ body: toResponse(object) });
    }
  );

  router.post(
    {
      path: API_BASE_PATH,
      validate: { body: definitionBody },
      security,
      options: { access },
    },
    async (context, request, response) => {
      const parsed = customAppDefinitionSchema.safeParse(request.body);
      if (!parsed.success) {
        return response.badRequest({ body: { message: parsed.error.message } });
      }
      const client = (await context.core).savedObjects.client;
      const object = await client.create<CustomAppAttributes>(
        CUSTOM_APP_SAVED_OBJECT_TYPE,
        toAttributes(parsed.data)
      );
      return response.ok({ body: toResponse(object) });
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
      const parsed = customAppDefinitionSchema.safeParse(request.body);
      if (!parsed.success) {
        return response.badRequest({ body: { message: parsed.error.message } });
      }
      const client = (await context.core).savedObjects.client;
      await client.update<CustomAppAttributes>(
        CUSTOM_APP_SAVED_OBJECT_TYPE,
        request.params.id,
        toAttributes(parsed.data)
      );
      return response.ok({ body: { id: request.params.id, definition: parsed.data } });
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
