/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { IRouter, Logger, SecurityServiceStart } from '@kbn/core/server';

/**
 * TEMPORARY: lets a deployed PR verify `core.security.authz.uiam.hasBillingAccess` with real
 * Cloud users. Remove before merging.
 */
export function defineTemporaryBillingAccessRoute({
  router,
  logger,
  getCoreSecurity,
}: {
  router: IRouter;
  logger: Logger;
  getCoreSecurity: () => Promise<SecurityServiceStart>;
}) {
  router.get(
    {
      path: '/internal/security/uiam/billing_access',
      validate: false,
      security: {
        authz: {
          enabled: false,
          reason: 'Temporary route reporting the UIAM billing access decision for the caller.',
        },
      },
    },
    async (context, request, response) => {
      const { authz } = await getCoreSecurity();
      if (!authz.uiam) {
        return response.badRequest({ body: { message: 'UIAM authorization is not available.' } });
      }

      try {
        return response.ok({
          body: { hasBillingAccess: await authz.uiam.hasBillingAccess(request) },
        });
      } catch (err) {
        logger.error(`Failed to check billing access with UIAM: ${err}`, err);
        return response.customError({
          statusCode: Boom.isBoom(err) ? err.output.statusCode : 500,
          body: { message: err.message },
        });
      }
    }
  );
}
