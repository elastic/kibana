/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, SavedObject } from '@kbn/core/server';
import { NOTEBOOK_API_BASE_PATH, NOTEBOOK_SAVED_OBJECT_TYPE } from '../common/constants';
import type { FindNotebooksResponse } from '../common/types';
import { READ_NOTEBOOK_PRIVILEGE, WRITE_NOTEBOOK_PRIVILEGE } from './feature';
import { notebookAttributesSchema, type StoredNotebookAttributes } from './schema';

const MAX_PER_PAGE = 100;

const readSecurity = { authz: { requiredPrivileges: [READ_NOTEBOOK_PRIVILEGE] } };
const writeSecurity = { authz: { requiredPrivileges: [WRITE_NOTEBOOK_PRIVILEGE] } };

const idParamsSchema = schema.object({
  id: schema.string({ minLength: 1, maxLength: 256 }),
});

const findQuerySchema = schema.object({
  search: schema.maybe(schema.string({ maxLength: 1024 })),
  page: schema.number({ min: 1, max: 10_000, defaultValue: 1 }),
  perPage: schema.number({ min: 1, max: MAX_PER_PAGE, defaultValue: 20 }),
});

const toResponse = ({
  id,
  attributes,
  updated_at: updatedAt,
}: SavedObject<StoredNotebookAttributes>) => ({ id, attributes, updatedAt });

/** Registers the internal notebook CRUD routes backed by the request-scoped saved objects client. */
export const registerNotebookRoutes = (router: IRouter): void => {
  router.get(
    {
      path: `${NOTEBOOK_API_BASE_PATH}/_find`,
      security: readSecurity,
      options: { access: 'internal' },
      validate: { query: findQuerySchema },
    },
    router.handleLegacyErrors(async (context, request, response) => {
      const { search, page, perPage } = request.query;
      const { client } = (await context.core).savedObjects;
      const { total, saved_objects: savedObjects } = await client.find<StoredNotebookAttributes>({
        type: NOTEBOOK_SAVED_OBJECT_TYPE,
        search: search ? `${search}*` : undefined,
        searchFields: ['title^3', 'description'],
        defaultSearchOperator: 'AND',
        fields: ['title', 'description'],
        sortField: 'updated_at',
        sortOrder: 'desc',
        page,
        perPage,
      });
      const body: FindNotebooksResponse = {
        total,
        notebooks: savedObjects.map(({ id, attributes, updated_at: updatedAt }) => ({
          id,
          title: attributes.title,
          description: attributes.description,
          updatedAt,
        })),
      };
      return response.ok({ body });
    })
  );

  router.get(
    {
      path: `${NOTEBOOK_API_BASE_PATH}/{id}`,
      security: readSecurity,
      options: { access: 'internal' },
      validate: { params: idParamsSchema },
    },
    router.handleLegacyErrors(async (context, request, response) => {
      const { client } = (await context.core).savedObjects;
      const notebook = await client.get<StoredNotebookAttributes>(
        NOTEBOOK_SAVED_OBJECT_TYPE,
        request.params.id
      );
      return response.ok({ body: toResponse(notebook) });
    })
  );

  router.post(
    {
      path: NOTEBOOK_API_BASE_PATH,
      security: writeSecurity,
      options: { access: 'internal' },
      validate: { body: notebookAttributesSchema },
    },
    router.handleLegacyErrors(async (context, request, response) => {
      const { client } = (await context.core).savedObjects;
      const notebook = await client.create<StoredNotebookAttributes>(
        NOTEBOOK_SAVED_OBJECT_TYPE,
        request.body
      );
      return response.ok({ body: toResponse(notebook) });
    })
  );

  router.put(
    {
      path: `${NOTEBOOK_API_BASE_PATH}/{id}`,
      security: writeSecurity,
      options: { access: 'internal' },
      validate: { params: idParamsSchema, body: notebookAttributesSchema },
    },
    router.handleLegacyErrors(async (context, request, response) => {
      const { client } = (await context.core).savedObjects;
      // Without mergeAttributes: false the update deep-merges cells, so deleted cells would survive.
      const { id, updated_at: updatedAt } = await client.update<StoredNotebookAttributes>(
        NOTEBOOK_SAVED_OBJECT_TYPE,
        request.params.id,
        request.body,
        { mergeAttributes: false }
      );
      return response.ok({ body: { id, attributes: request.body, updatedAt } });
    })
  );

  router.delete(
    {
      path: `${NOTEBOOK_API_BASE_PATH}/{id}`,
      security: writeSecurity,
      options: { access: 'internal' },
      validate: { params: idParamsSchema },
    },
    router.handleLegacyErrors(async (context, request, response) => {
      const { client } = (await context.core).savedObjects;
      await client.delete(NOTEBOOK_SAVED_OBJECT_TYPE, request.params.id);
      return response.noContent();
    })
  );
};
