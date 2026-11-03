/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { INTERNAL_CASES_SPACE_SETTINGS_URL } from '../../../../common/constants';
import type { CasesSpaceSettings } from '../../../../common/types/domain/space_settings/v1';
import { CasesSpaceSettingsSchema } from '../../../../common/types/domain/space_settings/v1';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

export const getSpaceSettingsRoute = createCasesRoute({
  method: 'get',
  path: INTERNAL_CASES_SPACE_SETTINGS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'internal',
  },
  handler: async ({ context, response }) => {
    try {
      const casesContext = await context.cases;
      const casesClient = await casesContext.getCasesClient();

      return response.ok({ body: await casesClient.spaceSettings.get() });
    } catch (error) {
      throw createCaseError({
        message: `Failed to get the cases space settings in route: ${error}`,
        error,
      });
    }
  },
});

export const putSpaceSettingsRoute = createCasesRoute<unknown, unknown, CasesSpaceSettings>({
  method: 'put',
  path: INTERNAL_CASES_SPACE_SETTINGS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'internal',
  },
  params: {
    // The schema bounds the list and every string in it.
    body: buildRouteValidationWithZod(CasesSpaceSettingsSchema),
  },
  handler: async ({ context, request, response }) => {
    try {
      const casesContext = await context.cases;
      const casesClient = await casesContext.getCasesClient();

      return response.ok({ body: await casesClient.spaceSettings.update(request.body) });
    } catch (error) {
      throw createCaseError({
        message: `Failed to update the cases space settings in route: ${error}`,
        error,
      });
    }
  },
});
