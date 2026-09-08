/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import { CASE_FIELD_DEFINITIONS_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { getTypedApiErrorAttributes } from '../../../common/api_errors';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';
import { PublicFieldDefinitionWriteBodySchema } from './public_field_definition_write_body';
import { toPublicFieldDefinition } from './to_public_field_definition';

/**
 * POST /api/cases/field_definitions
 * Public route — create a reusable field definition.
 */
export const postPublicFieldDefinitionRoute = createCasesRoute({
  method: 'post',
  path: CASE_FIELD_DEFINITIONS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'public',
    summary: 'Create a reusable field definition',
    tags: ['oas-tag:cases'],
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();

      const bodyResult = PublicFieldDefinitionWriteBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return response.badRequest({
          body: { message: `Invalid request body: ${JSON.stringify(bodyResult.error.issues)}` },
        });
      }

      const created = await casesClient.fieldDefinitions.createFieldDefinition(bodyResult.data);

      return response.ok({ body: toPublicFieldDefinition(created.attributes) });
    } catch (error) {
      if (isBoom(error)) {
        if (error.output.statusCode === 409) {
          const attributes = getTypedApiErrorAttributes(error);
          return response.conflict({
            body: attributes ? { message: error.message, attributes } : { message: error.message },
          });
        }
        if (error.output.statusCode === 403) {
          return response.forbidden({ body: { message: error.message } });
        }
      }

      throw createCaseError({
        message: `Failed to create field definition: ${error}`,
        error,
      });
    }
  },
});
