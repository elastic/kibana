/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import { ApiPrivileges } from '@kbn/core-security-server';
import { PLUGIN_ID, ROUTE_VERSIONS } from '../../common/constants';
import type { InferenceFeaturesResponse } from '../../common/types';
import { APIRoutes } from '../../common/types';
import type { InferenceFeatureRegistry } from '../inference_feature_registry';
import { errorHandler } from '../utils/error_handler';

type ConditionValue = string | number | boolean | null;

export const defineInferenceFeaturesRoutes = ({
  logger,
  router,
  featureRegistry,
}: {
  logger: Logger;
  router: IRouter;
  featureRegistry: InferenceFeatureRegistry;
}) => {
  router.versioned
    .get({
      access: 'internal',
      path: APIRoutes.GET_INFERENCE_FEATURES,
      security: {
        authz: {
          requiredPrivileges: [ApiPrivileges.manage(PLUGIN_ID)],
        },
      },
    })
    .addVersion(
      {
        security: {
          authz: {
            requiredPrivileges: [ApiPrivileges.manage(PLUGIN_ID)],
          },
        },
        validate: {},
        version: ROUTE_VERSIONS.v1,
      },
      errorHandler(logger)(async (context, _request, response) => {
        const { uiSettings } = await context.core;
        const allFeatures = featureRegistry.getAll();

        const conditionKeys = [
          ...new Set(
            allFeatures.flatMap((feature) =>
              feature.visibilityCondition ? [feature.visibilityCondition.key] : []
            )
          ),
        ];

        // Read each referenced uiSetting in parallel. Failing to read a setting
        // fails open (the feature stays visible) so the page degrades gracefully
        // when uiSettings is unavailable; the missing key is detected by the
        // `.has()` check below rather than a sentinel value.
        const settingValues = new Map<string, ConditionValue>();
        await Promise.all(
          conditionKeys.map(async (key) => {
            try {
              settingValues.set(key, await uiSettings.client.get<ConditionValue>(key));
            } catch (error) {
              logger.debug(
                `Failed to read uiSetting "${key}" while resolving inference feature visibility; failing open. Reason: ${error.message}`
              );
            }
          })
        );

        const visibleFeatures = allFeatures.filter((feature) => {
          const condition = feature.visibilityCondition;
          if (!condition) return true;
          if (!settingValues.has(condition.key)) return true;
          return settingValues.get(condition.key) === condition.value;
        });

        const body: InferenceFeaturesResponse = { features: visibleFeatures };

        return response.ok({
          body,
          headers: { 'content-type': 'application/json' },
        });
      })
    );
};
