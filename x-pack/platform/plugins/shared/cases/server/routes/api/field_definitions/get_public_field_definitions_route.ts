/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { CASE_FIELD_DEFINITIONS_URL } from '../../../../common/constants';
import type { FieldDefinitionsFindRequest } from '../../../../common/types/api/field_definition/v1';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';
import { toPublicFieldDefinition } from './to_public_field_definition';

/**
 * GET /api/cases/field_definitions
 * Public route — list field definitions for the given owner(s).
 *
 * Pagination and search are applied in the handler over the already-bounded result set
 * (MAX_FIELD_DEFINITIONS_PER_OWNER = 200). Revisit if the cap is ever lifted.
 */
export const getPublicFieldDefinitionsRoute = createCasesRoute({
  method: 'get',
  path: CASE_FIELD_DEFINITIONS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'public',
    summary: 'Get all reusable field definitions',
    tags: ['oas-tag:cases'],
  },
  params: {
    query: schema.object({
      owner: schema.oneOf([
        schema.arrayOf(schema.string({ maxLength: 50 }), { maxSize: 10 }),
        schema.string({ maxLength: 50 }),
      ]),
      isGlobal: schema.maybe(schema.boolean()),
      page: schema.number({ defaultValue: 1, min: 1 }),
      perPage: schema.number({ defaultValue: 20, min: 1, max: 100 }),
      sortField: schema.maybe(
        schema.oneOf([
          schema.literal('name'),
          schema.literal('owner'),
          schema.literal('isGlobal'),
          schema.literal('displayOrder'),
        ])
      ),
      sortOrder: schema.maybe(schema.oneOf([schema.literal('asc'), schema.literal('desc')])),
      search: schema.maybe(schema.string({ maxLength: 1000 })),
    }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();

      const { owner, isGlobal, page, perPage, sortField, sortOrder, search } = request.query;

      // The schema validator guarantees `owner` is a valid Owner or Owner[] string value;
      // cast to satisfy the client's branded union type.
      const { fieldDefinitions: all } = await casesClient.fieldDefinitions.getFieldDefinitions({
        owner: owner as FieldDefinitionsFindRequest['owner'],
        isGlobal,
      });

      let filtered = all;

      if (search) {
        const lower = search.toLowerCase();
        filtered = filtered.filter(
          ({ name, description }) =>
            name.toLowerCase().includes(lower) ||
            (description !== undefined && description.toLowerCase().includes(lower))
        );
      }

      if (sortField) {
        const order = sortOrder === 'desc' ? -1 : 1;
        filtered = [...filtered].sort((a, b) => {
          const av = a[sortField] ?? '';
          const bv = b[sortField] ?? '';
          if (av < bv) return -order;
          if (av > bv) return order;
          return 0;
        });
      }

      const total = filtered.length;
      const start = (page - 1) * perPage;
      const pageItems = filtered.slice(start, start + perPage).map(toPublicFieldDefinition);

      return response.ok({
        body: { fieldDefinitions: pageItems, page, perPage, total },
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to get field definitions: ${error}`,
        error,
      });
    }
  },
});
