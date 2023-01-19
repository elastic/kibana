/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { listHiddenTypes, catchAndReturnBoomErrors } from './utils';

const KBN_CLIENT_API_PREFIX = '/internal/ftr/kbn_client_so';

export const registerRoutes = (router: IRouter) => {
  // GET
  router.get(
    {
      path: `${KBN_CLIENT_API_PREFIX}/{type}/{id}`,
      validate: {
        params: schema.object({
          type: schema.string(),
          id: schema.string(),
        }),
      },
    },
    catchAndReturnBoomErrors(async (ctx, req, res) => {
      const { type, id } = req.params;
      const { savedObjects } = await ctx.core;

      const hiddenTypes = listHiddenTypes(savedObjects.typeRegistry);
      const soClient = savedObjects.getClient({ includedHiddenTypes: hiddenTypes });

      const object = await soClient.get(type, id);
      return res.ok({ body: object });
    })
  );

  // CREATE
  router.post(
    {
      path: `${KBN_CLIENT_API_PREFIX}/{type}/{id?}`,
      validate: {
        params: schema.object({
          type: schema.string(),
          id: schema.maybe(schema.string()),
        }),
        query: schema.object({
          overwrite: schema.boolean({ defaultValue: false }),
        }),
        body: schema.object({
          attributes: schema.recordOf(schema.string(), schema.any()),
          migrationVersion: schema.maybe(schema.recordOf(schema.string(), schema.string())),
          references: schema.maybe(
            schema.arrayOf(
              schema.object({
                name: schema.string(),
                type: schema.string(),
                id: schema.string(),
              })
            )
          ),
        }),
      },
    },
    catchAndReturnBoomErrors(async (ctx, req, res) => {
      const { type, id } = req.params;
      const { overwrite } = req.query;
      const { attributes, migrationVersion, references } = req.body;
      const { savedObjects } = await ctx.core;

      const hiddenTypes = listHiddenTypes(savedObjects.typeRegistry);
      const soClient = savedObjects.getClient({ includedHiddenTypes: hiddenTypes });

      const options = {
        id,
        overwrite,
        migrationVersion,
        references,
      };
      const result = await soClient.create(type, attributes, options);
      return res.ok({ body: result });
    })
  );

  // UPDATE
  router.put(
    {
      path: `${KBN_CLIENT_API_PREFIX}/{type}/{id}`,
      validate: {
        params: schema.object({
          type: schema.string(),
          id: schema.string(),
        }),
        body: schema.object({
          attributes: schema.recordOf(schema.string(), schema.any()),
          migrationVersion: schema.maybe(schema.string()),
          references: schema.maybe(
            schema.arrayOf(
              schema.object({
                name: schema.string(),
                type: schema.string(),
                id: schema.string(),
              })
            )
          ),
        }),
      },
    },
    catchAndReturnBoomErrors(async (ctx, req, res) => {
      const { type, id } = req.params;
      const { attributes, migrationVersion, references } = req.body;
      const { savedObjects } = await ctx.core;

      const hiddenTypes = listHiddenTypes(savedObjects.typeRegistry);
      const soClient = savedObjects.getClient({ includedHiddenTypes: hiddenTypes });

      const options = { version: migrationVersion, references };
      const result = await soClient.update(type, id, attributes, options);
      return res.ok({ body: result });
    })
  );

  // DELETE
  router.delete(
    {
      path: `${KBN_CLIENT_API_PREFIX}/{type}/{id}`,
      validate: {
        params: schema.object({
          type: schema.string(),
          id: schema.string(),
        }),
      },
    },
    catchAndReturnBoomErrors(async (ctx, req, res) => {
      const { type, id } = req.params;
      const { savedObjects } = await ctx.core;

      const hiddenTypes = listHiddenTypes(savedObjects.typeRegistry);
      const soClient = savedObjects.getClient({ includedHiddenTypes: hiddenTypes });

      const result = await soClient.delete(type, id, { force: true });
      return res.ok({ body: result });
    })
  );

  // BULK_DELETE
  router.post(
    {
      path: `${KBN_CLIENT_API_PREFIX}/_bulk_delete`,
      validate: {
        body: schema.arrayOf(
          schema.object({
            type: schema.string(),
            id: schema.string(),
          })
        ),
      },
    },
    catchAndReturnBoomErrors(async (ctx, req, res) => {
      const { savedObjects } = await ctx.core;
      const hiddenTypes = listHiddenTypes(savedObjects.typeRegistry);
      const soClient = savedObjects.getClient({ includedHiddenTypes: hiddenTypes });

      const statuses = await soClient.bulkDelete(req.body, { force: true });
      return res.ok({ body: statuses });
    })
  );

  // FIND
  router.get(
    {
      path: `${KBN_CLIENT_API_PREFIX}/_find`,
      validate: {
        query: schema.object({
          per_page: schema.number({ min: 0, defaultValue: 20 }),
          page: schema.number({ min: 0, defaultValue: 1 }),
          type: schema.oneOf([schema.string(), schema.arrayOf(schema.string())]),
          search: schema.maybe(schema.string()),
          fields: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
        }),
      },
    },
    catchAndReturnBoomErrors(async (ctx, req, res) => {
      const query = req.query;

      const { savedObjects } = await ctx.core;
      const hiddenTypes = listHiddenTypes(savedObjects.typeRegistry);
      const soClient = savedObjects.getClient({ includedHiddenTypes: hiddenTypes });

      const result = await soClient.find({
        perPage: query.per_page,
        page: query.page,
        type: Array.isArray(query.type) ? query.type : [query.type],
        search: query.search,
        fields: typeof query.fields === 'string' ? [query.fields] : query.fields,
      });

      return res.ok({ body: result });
    })
  );
};
