/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { LicenseType } from '@kbn/licensing-types';
import { LICENSE_TYPE } from '@kbn/licensing-types';
import type { FeatureUsageServiceSetup } from '../../services';
import type { LicensingRouter } from '../../types';

export function registerRegisterFeatureRoute(
  router: LicensingRouter,
  featureUsageSetup: FeatureUsageServiceSetup
) {
  router.post(
    {
      path: '/internal/licensing/feature_usage/register',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
      validate: {
        body: schema.arrayOf(
          schema.object({
            featureId: schema.string(),
            licenseType: schema.string({
              validate: (value) => {
                if (!(value in LICENSE_TYPE)) {
                  return `Invalid license type: ${value}`;
                }
              },
            }),
          })
        ),
      },
    },
    async (context, request, response) => {
      const registrations = request.body;

      registrations.forEach(({ featureId, licenseType }) => {
        featureUsageSetup.register(featureId, licenseType as LicenseType);
      });

      return response.ok({
        body: {
          success: true,
        },
      });
    }
  );
}
