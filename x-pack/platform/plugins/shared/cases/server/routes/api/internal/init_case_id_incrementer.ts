/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesIdIncrementerTask } from '../../../tasks/incremental_id';
import { INTERNAL_INIT_CASE_ID_INCREMENTER_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

// TODO: To confirm all spaces have a unique incrementer, we may ask users to enable this feature in every new space created
// manually hitting this route via a button on the settings page or similar. We could also auto enable it via visiting the cases page
// or on first case creation in a new space?
export const getInitCaseIdIncrementerRoute = (incrementIdTask: CasesIdIncrementerTask) =>
  createCasesRoute({
    method: 'post',
    path: INTERNAL_INIT_CASE_ID_INCREMENTER_URL,
    security: DEFAULT_CASES_ROUTE_SECURITY,
    routerOptions: {
      access: 'internal',
    },
    handler: async ({ context, request, response }) => {
      let spaceId;
      try {
        spaceId = (await context.cases).spaces?.spacesService.getSpaceId(request);
        if (spaceId) {
          const namespace = (await context.cases).spaces?.spacesService.spaceIdToNamespace(spaceId);
          incrementIdTask.addNamespace(namespace);
        }
        return response.ok();
      } catch (error) {
        throw createCaseError({
          message: `Failed to track space for incremental id service, ${spaceId}: ${error}`,
          error,
        });
      }
    },
  });
