/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { IRouter, Logger } from '@kbn/core/server';

/**
 * TEMPORARY: lets a deployed PR verify every `core.security.authz.uiam` check with real Cloud
 * users. Remove before merging.
 */
export function defineTemporaryAccessRoute({
  router,
  logger,
}: {
  router: IRouter;
  logger: Logger;
}) {
  router.get(
    {
      path: '/internal/security/uiam/access',
      validate: false,
      security: {
        authz: {
          enabled: false,
          reason: 'Temporary route reporting the UIAM access decisions for the caller.',
        },
      },
    },
    async (context, request, response) => {
      const { security } = await context.core;
      const { uiam } = security.authz;
      if (!uiam) {
        return response.badRequest({ body: { message: 'UIAM authorization is not available.' } });
      }

      try {
        const [canViewBillingDetails, canInviteOrganizationMembers, canListOrganizationMembers] =
          await Promise.all([
            uiam.canViewBillingDetails(),
            uiam.canInviteOrganizationMembers(),
            uiam.canListOrganizationMembers(),
          ]);
        return response.ok({
          body: { canViewBillingDetails, canInviteOrganizationMembers, canListOrganizationMembers },
        });
      } catch (err) {
        logger.error(`Failed to check access with UIAM: ${err}`, err);
        return response.customError({
          statusCode: Boom.isBoom(err) ? err.output.statusCode : 500,
          body: { message: err.message },
        });
      }
    }
  );
}
