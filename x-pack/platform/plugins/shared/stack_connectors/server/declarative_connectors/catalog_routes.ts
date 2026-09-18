/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { DeclarativeCatalogService } from './catalog_service';

const BASE_PATH = '/internal/stack_connectors/declarative_catalog';

/** Registers internal health and refresh routes for the declarative catalog. */
export const registerDeclarativeCatalogRoutes = ({
  router,
  service,
}: {
  router: IRouter;
  service: DeclarativeCatalogService;
}): void => {
  router.get(
    {
      path: `${BASE_PATH}/_health`,
      security: {
        authz: {
          enabled: false,
          reason: 'This internal development API only reports declarative catalog health.',
        },
      },
      validate: false,
      options: {
        access: 'internal',
      },
    },
    async (_context, _request, response) => response.ok({ body: service.getHealth() })
  );

  router.post(
    {
      path: `${BASE_PATH}/_refresh`,
      security: {
        authz: {
          enabled: false,
          reason: 'This internal development API refreshes the declarative connector catalog.',
        },
      },
      validate: false,
      options: {
        access: 'internal',
      },
    },
    async (_context, _request, response) => {
      try {
        await service.refresh();
      } catch {
        // Health already records lastError; never fail the process with a 500.
      }
      return response.ok({ body: service.getHealth() });
    }
  );
};
