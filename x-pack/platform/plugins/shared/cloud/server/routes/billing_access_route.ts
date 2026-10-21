/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteOptions } from '.';
import { CLOUD_BILLING_ACCESS_ROUTE } from '../../common/constants';
import type { CloudBillingAccessResponse } from '../../common/types';

export const setGetBillingAccessRoute = ({
  logger,
  router,
  getBillingAccessChecker,
}: RouteOptions) => {
  router.versioned
    .get({
      path: CLOUD_BILLING_ACCESS_ROUTE,
      security: {
        authz: {
          enabled: false,
          reason: 'The registered checker decides, on behalf of the calling user, with UIAM',
        },
      },
      access: 'internal',
      summary: 'Tells whether the current user may see Cloud billing',
    })
    .addVersion({ version: '1', validate: false }, async (context, request, response) => {
      const checkBillingAccess = getBillingAccessChecker();
      if (!checkBillingAccess) {
        const body: CloudBillingAccessResponse = { hasAccess: null };
        return response.ok({ body });
      }

      try {
        const body: CloudBillingAccessResponse = { hasAccess: await checkBillingAccess(request) };
        return response.ok({ body });
      } catch (err) {
        logger.warn(`Failed to check billing access: ${err.message}`);
        return response.customError({
          statusCode: 503,
          body: { message: 'Billing access could not be checked.' },
        });
      }
    });
};
