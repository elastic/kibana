/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  INTERNAL_CASE_OBSERVABLES_BULK_CREATE_URL,
  MAX_CASE_ID_LENGTH,
  MAX_OBSERVABLES_BULK_CREATE,
  MAX_OBSERVABLE_DESCRIPTION_LENGTH,
  MAX_OBSERVABLE_METADATA_ENTRIES,
  MAX_OBSERVABLE_METADATA_KEY_LENGTH,
  MAX_OBSERVABLE_METADATA_VALUE_LENGTH,
  MAX_OBSERVABLE_TYPE_KEY_LENGTH,
  MAX_OBSERVABLE_VALUE_LENGTH,
} from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

export const bulkCreateObservablesRoute = createCasesRoute({
  method: 'post',
  path: INTERNAL_CASE_OBSERVABLES_BULK_CREATE_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    params: schema.object({
      case_id: schema.string({ maxLength: MAX_CASE_ID_LENGTH }),
    }),
    body: schema.object({
      observables: schema.arrayOf(
        schema.object({
          typeKey: schema.string({ maxLength: MAX_OBSERVABLE_TYPE_KEY_LENGTH }),
          value: schema.string({ maxLength: MAX_OBSERVABLE_VALUE_LENGTH }),
          description: schema.nullable(
            schema.string({ maxLength: MAX_OBSERVABLE_DESCRIPTION_LENGTH })
          ),
          metadata: schema.maybe(
            schema.recordOf(
              schema.string({ minLength: 1, maxLength: MAX_OBSERVABLE_METADATA_KEY_LENGTH }),
              schema.string({ maxLength: MAX_OBSERVABLE_METADATA_VALUE_LENGTH }),
              {
                validate: (metadata) =>
                  Object.keys(metadata).length > MAX_OBSERVABLE_METADATA_ENTRIES
                    ? `must have at most ${MAX_OBSERVABLE_METADATA_ENTRIES} entries`
                    : undefined,
              }
            )
          ),
        }),
        { minSize: 1, maxSize: MAX_OBSERVABLES_BULK_CREATE }
      ),
    }),
  },
  routerOptions: {
    access: 'internal',
    summary: `Bulk create case observables`,
    description: `Adds up to ${MAX_OBSERVABLES_BULK_CREATE} observables to a case. Reports how many were added, were already on the case, or did not fit under the per-case limit.`,
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();

      const result = await casesClient.cases.bulkCreateObservables({
        caseId: request.params.case_id,
        observables: request.body.observables,
      });

      return response.ok({ body: result });
    } catch (error) {
      throw createCaseError({
        message: `Failed to bulk create observables in route case id: ${request.params.case_id}: ${error}`,
        error,
      });
    }
  },
});
