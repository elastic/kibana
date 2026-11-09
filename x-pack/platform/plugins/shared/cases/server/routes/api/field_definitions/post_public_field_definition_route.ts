/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { isBoom } from '@hapi/boom';
import {
  CASE_FIELD_DEFINITIONS_URL,
  MAX_FIELD_DEFINITION_NAME_LENGTH,
} from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { getTypedApiErrorAttributes } from '../../../common/api_errors';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';
import { PublicFieldDefinitionWriteBodySchema } from './public_field_definition_write_body';
import { toPublicFieldDefinition } from './to_public_field_definition';
import { validateFieldDefinitionYaml } from './validate_field_definition_input';

/**
 * POST /api/cases/field_definitions
 * Public route — create a reusable field definition. `dry_run=true` runs the full
 * authorization + body + name-uniqueness validation without writing anything.
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
  params: {
    query: schema.object({
      dry_run: schema.boolean({ defaultValue: false }),
    }),
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

      const definitionValidation = validateFieldDefinitionYaml(bodyResult.data.definition);
      if (!definitionValidation.valid) {
        return response.badRequest({ body: { message: definitionValidation.message } });
      }

      // Resolve `name` from the YAML when the caller omitted it, then enforce the public limits.
      const resolvedName = bodyResult.data.name ?? definitionValidation.name;
      if (resolvedName.length === 0) {
        return response.badRequest({ body: { message: 'Field name must not be empty' } });
      }
      if (resolvedName.length > MAX_FIELD_DEFINITION_NAME_LENGTH) {
        return response.badRequest({
          body: {
            message: `Field name must not exceed ${MAX_FIELD_DEFINITION_NAME_LENGTH} characters`,
          },
        });
      }

      const input = {
        ...bodyResult.data,
        name: resolvedName,
      };

      if (request.query.dry_run) {
        await casesClient.fieldDefinitions.validateCreateFieldDefinition(input);
        return response.ok({ body: { valid: true } });
      }

      const created = await casesClient.fieldDefinitions.createFieldDefinition(input);

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
