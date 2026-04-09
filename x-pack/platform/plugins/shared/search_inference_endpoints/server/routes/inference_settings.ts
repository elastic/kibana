/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { ApiPrivileges } from '@kbn/core-security-server';
import { i18n } from '@kbn/i18n';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import {
  INFERENCE_SETTINGS_SO_TYPE,
  INFERENCE_SETTINGS_ID,
  PLUGIN_ID,
  ROUTE_VERSIONS,
} from '../../common/constants';
import type { InferenceSettingsAttributes, InferenceSettingsResponse } from '../../common/types';
import { APIRoutes } from '../../common/types';
import { inferenceSettingsSchemaV1 } from '../saved_objects/schema/v1';
import { fetchInferenceEndpoints } from '../lib/fetch_inference_endpoints';
import type { InferenceFeatureRegistry } from '../inference_feature_registry';
import type { InferenceFeatureConfig } from '../types';
import { errorHandler } from '../utils/error_handler';
import { parseInferenceSettingsSO, validateInferenceSettings } from '../utils/inference_settings';

const EMPTY_SETTINGS: InferenceSettingsResponse = {
  _meta: { id: INFERENCE_SETTINGS_ID },
  data: { features: [] },
};

const getEffectiveEndpoints = (
  feature: InferenceFeatureConfig,
  recommendedEndpointsById: Map<string, string[]>
): string[] => {
  if (feature.recommendedEndpoints.length > 0) {
    return feature.recommendedEndpoints;
  }
  if (feature.parentFeatureId) {
    const parentEndpoints = recommendedEndpointsById.get(feature.parentFeatureId) ?? [];
    if (parentEndpoints.length > 0) {
      return parentEndpoints;
    }
  }
  return [defaultInferenceEndpoints.KIBANA_DEFAULT_CHAT_COMPLETION];
};

const findInvalidEndpoints = (
  settings: InferenceSettingsAttributes,
  features: InferenceFeatureConfig[],
  liveEndpointIds: Set<string>
): string[] => {
  const recommendedEndpointsById = new Map(
    features.map((f) => [f.featureId, f.recommendedEndpoints])
  );
  const savedMap = new Map(
    settings.features.map((f) => [f.feature_id, f.endpoints.map((e) => e.id)])
  );

  const childFeatures = features.filter((f) => f.parentFeatureId !== undefined);
  const allEffectiveIds = new Set<string>();

  for (const feature of childFeatures) {
    const saved = savedMap.get(feature.featureId);
    const effectiveIds =
      saved && saved.length > 0 ? saved : getEffectiveEndpoints(feature, recommendedEndpointsById);
    for (const id of effectiveIds) {
      allEffectiveIds.add(id);
    }
  }

  return [...allEffectiveIds].filter((id) => !liveEndpointIds.has(id));
};

export const defineInferenceSettingsRoutes = ({
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
      path: APIRoutes.GET_INFERENCE_SETTINGS,
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
        const coreContext = await context.core;
        const soClient = coreContext.savedObjects.getClient({
          includedHiddenTypes: [INFERENCE_SETTINGS_SO_TYPE],
        });
        const esClient = coreContext.elasticsearch.client.asCurrentUser;

        const validateEndpoints = async (
          settingsBody: InferenceSettingsResponse
        ): Promise<InferenceSettingsResponse> => {
          try {
            const { inferenceEndpoints } = await fetchInferenceEndpoints(esClient);
            const liveIds = new Set(inferenceEndpoints.map((ep) => ep.inference_id));
            const registeredFeatures = featureRegistry.getAll();
            const invalid = findInvalidEndpoints(settingsBody.data, registeredFeatures, liveIds);
            return { ...settingsBody, invalidEndpoints: invalid };
          } catch (e) {
            logger.warn(`Failed to validate inference endpoints: ${e.message}`);
            return settingsBody;
          }
        };

        try {
          const so = await soClient.get<InferenceSettingsAttributes>(
            INFERENCE_SETTINGS_SO_TYPE,
            INFERENCE_SETTINGS_ID
          );

          if (so.error) {
            if (so.error.statusCode === 404) {
              const body = await validateEndpoints(EMPTY_SETTINGS);
              return response.ok({
                body,
                headers: { 'content-type': 'application/json' },
              });
            }
            return response.customError({
              statusCode: so.error.statusCode,
              body: {
                message: so.error.message,
                attributes: {
                  error: so.error.error,
                  ...(so.error.metadata ?? {}),
                },
              },
            });
          }

          const body = await validateEndpoints(parseInferenceSettingsSO(so));
          return response.ok({
            body,
            headers: { 'content-type': 'application/json' },
          });
        } catch (e) {
          if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
            const body = await validateEndpoints(EMPTY_SETTINGS);
            return response.ok({
              body,
              headers: { 'content-type': 'application/json' },
            });
          }
          throw e;
        }
      })
    );

  router.versioned
    .put({
      access: 'internal',
      path: APIRoutes.PUT_INFERENCE_SETTINGS,
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
        validate: {
          request: {
            body: inferenceSettingsSchemaV1,
          },
        },
        version: ROUTE_VERSIONS.v1,
      },
      errorHandler(logger)(async (context, request, response) => {
        const attrs = request.body;

        const validationErrors = validateInferenceSettings(attrs);
        if (validationErrors.length > 0) {
          return response.badRequest({
            body: {
              message: i18n.translate('xpack.searchInferenceEndpoints.settings.validationError', {
                defaultMessage: 'Invalid inference settings',
              }),
              attributes: { errors: validationErrors },
            },
          });
        }

        const soClient = (await context.core).savedObjects.getClient({
          includedHiddenTypes: [INFERENCE_SETTINGS_SO_TYPE],
        });

        const so = await soClient.create<InferenceSettingsAttributes>(
          INFERENCE_SETTINGS_SO_TYPE,
          attrs,
          { id: INFERENCE_SETTINGS_ID, overwrite: true }
        );

        if (so.error) {
          return response.customError({
            statusCode: so.error.statusCode,
            body: {
              message: so.error.message,
              attributes: {
                error: so.error.error,
                ...(so.error.metadata ?? {}),
              },
            },
          });
        }

        const body: InferenceSettingsResponse = parseInferenceSettingsSO(so);
        return response.ok({
          body,
          headers: { 'content-type': 'application/json' },
        });
      })
    );
};
