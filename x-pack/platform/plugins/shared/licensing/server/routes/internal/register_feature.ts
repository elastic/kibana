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
import {
  MAX_LICENSING_FEATURE_ID_LENGTH,
  MAX_LICENSING_LICENSE_TYPE_LENGTH,
} from './route_length_limits';

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
            featureId: schema.string({ maxLength: MAX_LICENSING_FEATURE_ID_LENGTH }),
            licenseType: schema.string({
              maxLength: MAX_LICENSING_LICENSE_TYPE_LENGTH,
              validate: (value) => {
                if (!(value in LICENSE_TYPE)) {
                  return `Invalid license type: ${value}`;
                }
              },
            }),
          }),
          { maxSize: 1000 }
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
