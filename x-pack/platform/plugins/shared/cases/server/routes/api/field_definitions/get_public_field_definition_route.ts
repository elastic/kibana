/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { isBoom } from '@hapi/boom';
import {
  CASE_FIELD_DEFINITION_DETAILS_URL,
  MAX_FIELD_DEFINITION_ID_LENGTH,
} from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';
import { toPublicFieldDefinition } from './to_public_field_definition';

/**
 * GET /api/cases/field_definitions/{field_definition_id}
 * Public readonly route — get a single reusable field definition by ID.
 */
export const getPublicFieldDefinitionRoute = createCasesRoute({
  method: 'get',
  path: CASE_FIELD_DEFINITION_DETAILS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'public',
    summary: 'Get a reusable field definition by ID',
    tags: ['oas-tag:cases'],
  },
  params: {
    params: schema.object({
      field_definition_id: schema.string({ maxLength: MAX_FIELD_DEFINITION_ID_LENGTH }),
    }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();

      const { field_definition_id: fieldDefinitionId } = request.params as {
        field_definition_id: string;
      };

      const fieldDef = await casesClient.fieldDefinitions.getFieldDefinition(fieldDefinitionId);

      return response.ok({ body: toPublicFieldDefinition(fieldDef.attributes) });
    } catch (error) {
      if (isBoom(error)) {
        if (error.output.statusCode === 404) {
          return response.notFound({ body: { message: error.message } });
        }
        if (error.output.statusCode === 403) {
          return response.forbidden({ body: { message: error.message } });
        }
      }

      throw createCaseError({
        message: `Failed to get field definition: ${error}`,
        error,
      });
    }
  },
});
