/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { FeaturesPluginRouter } from '../types';
import { FeatureRegistry } from '../feature_registry';

/**
 * Describes parameters used to define HTTP routes.
 */
export interface RouteDefinitionParams {
  router: FeaturesPluginRouter;
  featureRegistry: FeatureRegistry;
}

export function defineRoutes({ router, featureRegistry }: RouteDefinitionParams) {
  router.get(
    {
      path: '/api/features',
      security: {
        authz: {
          requiredPrivileges: ['read_features'],
        },
      },
      options: {
        access: 'public',
        summary: `Get features`,
      },
      validate: {
        query: schema.object({ ignoreValidLicenses: schema.boolean({ defaultValue: false }) }),
      },
    },
    async (context, request, response) => {
      const { license: currentLicense } = await context.licensing;

      const allFeatures = featureRegistry.getAllKibanaFeatures({
        license: currentLicense,
        ignoreLicense: request.query.ignoreValidLicenses,
        // This API is used to power user-facing UIs, which, unlike our server-side internal backward compatibility
        // mechanisms, shouldn't display deprecated features.
        omitDeprecated: true,
      });

      return response.ok({
        body: allFeatures
          .sort(
            (f1, f2) =>
              (f1.order ?? Number.MAX_SAFE_INTEGER) - (f2.order ?? Number.MAX_SAFE_INTEGER)
          )
          .map((feature) => feature.toRaw()),
      });
    }
  );
}
