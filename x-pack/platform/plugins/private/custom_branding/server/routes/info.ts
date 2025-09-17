/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ILicense } from '@kbn/licensing-types';
import type { CustomBrandingInfoResponse } from '../../common/types';
import type { CustomBrandingRouter } from '../types';

export const registerInfoRoute = (router: CustomBrandingRouter) => {
  router.get(
    {
      path: '/api/custom_branding/info',
      security: {
        authc: {
          enabled: 'optional',
          reason:
            'Custom branding availability info should be available for authenticated and unauthenticated requests.',
        },
        authz: {
          enabled: false,
          reason:
            'This route is opted out from authorization, because this route is rather a status check route than a data fetching route',
        },
      },
      validate: false,
    },
    async (ctx, req, res) => {
      const allowed = isValidLicense((await ctx.licensing).license);

      if (!allowed) {
        return res.forbidden();
      }

      return res.ok({
        body: {
          allowed,
        } as CustomBrandingInfoResponse,
      });
    }
  );
};

const isValidLicense = (license: ILicense): boolean => {
  return license.hasAtLeast('enterprise');
};
