/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTERNAL_AVAILABLE_OWNERS_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

export const getAvailableOwnersRoute = createCasesRoute({
  method: 'get',
  path: INTERNAL_AVAILABLE_OWNERS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'internal',
  },
  handler: async ({ context, response }) => {
    try {
      const casesContext = await context.cases;
      const casesClient = await casesContext.getCasesClient();

      return response.ok({ body: { owners: await casesClient.cases.getAvailableOwners() } });
    } catch (error) {
      throw createCaseError({
        message: `Failed to retrieve the available case owners: ${error}`,
        error,
      });
    }
  },
});
