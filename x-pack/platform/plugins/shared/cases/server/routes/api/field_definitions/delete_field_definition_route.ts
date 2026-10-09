/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTERNAL_FIELD_DEFINITION_DETAILS_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

/**
 * DELETE /internal/cases/field-definitions/{field_definition_id}
 * Delete a reusable field definition
 */
export const deleteFieldDefinitionRoute = createCasesRoute({
  method: 'delete',
  path: INTERNAL_FIELD_DEFINITION_DETAILS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'internal',
    summary: 'Delete a reusable field definition',
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();

      const { field_definition_id: fieldDefinitionId } = request.params as {
        field_definition_id: string;
      };

      await casesClient.fieldDefinitions.deleteFieldDefinition(fieldDefinitionId);

      return response.noContent();
    } catch (error) {
      throw createCaseError({
        message: `Failed to delete field definition: ${error}`,
        error,
      });
    }
  },
});
