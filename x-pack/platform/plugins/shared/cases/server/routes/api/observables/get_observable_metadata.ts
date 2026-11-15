/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  INTERNAL_CASE_OBSERVABLE_METADATA_URL,
  MAX_CASE_ID_LENGTH,
  MAX_OBSERVABLE_TYPE_KEY_LENGTH,
  MAX_OBSERVABLE_VALUE_LENGTH,
} from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

export const getObservableMetadataRoute = createCasesRoute({
  method: 'post',
  path: INTERNAL_CASE_OBSERVABLE_METADATA_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    params: schema.object({
      case_id: schema.string({ maxLength: MAX_CASE_ID_LENGTH }),
    }),
    body: schema.object({
      typeKey: schema.string({ minLength: 1, maxLength: MAX_OBSERVABLE_TYPE_KEY_LENGTH }),
      value: schema.string({ minLength: 1, maxLength: MAX_OBSERVABLE_VALUE_LENGTH }),
    }),
  },
  routerOptions: {
    access: 'internal',
    summary: 'Get the metadata of an observable value',
    description:
      'Returns the metadata shared by the cases of the space and owner of a case for a type key and value, whether or not the case holds the value. The metadata is empty when the value holds none.',
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();
      const caseId = request.params.case_id;
      const result = await casesClient.cases.getObservableMetadata(caseId, request.body);

      return response.ok({ body: result });
    } catch (error) {
      throw createCaseError({
        message: `Failed to get the metadata of an observable value in route case id: ${request.params.case_id}: ${error}`,
        error,
      });
    }
  },
});
