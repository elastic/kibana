/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { join } from 'path';
import type { IRouter, KibanaRequest, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { ApiPrivileges } from '@kbn/core-security-server';
import { i18n } from '@kbn/i18n';
import type { InferenceConnector } from '@kbn/inference-common';
import {
  FEATURE_SETTINGS_API_VERSION,
  INFERENCE_SETTINGS_ID,
  INFERENCE_SETTINGS_SO_TYPE,
  PLUGIN_ID,
} from '../../common/constants';
import type { InferenceEndpointSetting, InferenceSettingsAttributes } from '../../common/types';
import { APIRoutes } from '../../common/types';
import type { InferenceFeatureRegistry } from '../inference_feature_registry';
import {
  featureSettingsFeatureIdSchema,
  inferenceFeatureEndpointsSchema,
  inferenceSettingsSchemaV2,
} from '../saved_objects/schema/v2';
import { errorHandler } from '../utils/error_handler';
import {
  validateEndpointParameters,
  validateFeatureIds,
  validateInferenceSettings,
} from '../utils/inference_settings';

const readSecurity = {
  authz: {
    requiredPrivileges: [ApiPrivileges.read(PLUGIN_ID)],
  },
};

const manageSecurity = {
  authz: {
    requiredPrivileges: [ApiPrivileges.manage(PLUGIN_ID)],
  },
};

const publicRouteOptions = {
  tags: ['oas-tag:model management'],
  availability: { stability: 'tech_preview' as const, since: '9.7.0' },
};

const EMPTY_SETTINGS: InferenceSettingsAttributes = { features: [] };

interface LoadedSettings {
  settings: InferenceSettingsAttributes;
  version?: string;
}

const loadSettings = async (soClient: SavedObjectsClientContract): Promise<LoadedSettings> => {
  try {
    const saved = await soClient.get<InferenceSettingsAttributes>(
      INFERENCE_SETTINGS_SO_TYPE,
      INFERENCE_SETTINGS_ID
    );
    return { settings: saved.attributes, version: saved.version };
  } catch (e) {
    if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
      return { settings: EMPTY_SETTINGS };
    }
    throw e;
  }
};

const saveSettings = async (
  soClient: SavedObjectsClientContract,
  settings: InferenceSettingsAttributes,
  version: string | undefined
): Promise<InferenceSettingsAttributes> => {
  const isExistingDocument = version !== undefined;
  const saved = await soClient.create<InferenceSettingsAttributes>(
    INFERENCE_SETTINGS_SO_TYPE,
    settings,
    { id: INFERENCE_SETTINGS_ID, overwrite: isExistingDocument, version }
  );
  return saved.attributes;
};

const isAllowedFeatureId = (
  featureId: string,
  featureRegistry: InferenceFeatureRegistry,
  savedFeatureIds: ReadonlySet<string>
): boolean => {
  const isRegistered = featureRegistry.get(featureId) !== undefined;
  const isSaved = savedFeatureIds.has(featureId);
  return isRegistered || isSaved;
};

const invalidSettingsBody = (errors: string[]) => ({
  message: i18n.translate('xpack.searchInferenceEndpoints.settings.validationError', {
    defaultMessage: 'Invalid inference settings',
  }),
  attributes: { errors },
});

const mergeFeature = (
  settings: InferenceSettingsAttributes,
  featureId: string,
  endpoints: InferenceEndpointSetting[]
): InferenceSettingsAttributes => {
  const isExistingFeature = settings.features.some((feature) => feature.feature_id === featureId);
  if (!isExistingFeature) {
    return {
      features: [...settings.features, { feature_id: featureId, endpoints }],
    };
  }

  return {
    features: settings.features.map((feature) =>
      feature.feature_id === featureId ? { feature_id: featureId, endpoints } : feature
    ),
  };
};

export const definePublicInferenceSettingsRoutes = ({
  logger,
  router,
  featureRegistry,
  getConnectorById,
}: {
  logger: Logger;
  router: IRouter;
  featureRegistry: InferenceFeatureRegistry;
  getConnectorById: (id: string, request: KibanaRequest) => Promise<InferenceConnector>;
}) => {
  router.versioned
    .get({
      access: 'public',
      path: APIRoutes.GET_FEATURE_SETTINGS,
      summary: 'Get feature settings',
      description:
        'Returns the models assigned to each AI feature in the current space. When nothing is saved, features is an empty list.',
      operationId: 'GetFeatureSettings',
      security: readSecurity,
      options: publicRouteOptions,
    })
    .addVersion(
      {
        version: FEATURE_SETTINGS_API_VERSION,
        security: readSecurity,
        validate: {
          request: {},
          response: {
            200: {
              body: () => inferenceSettingsSchemaV2,
              description: 'The saved feature settings for the current space.',
            },
          },
        },
        options: {
          oasOperationObject: () => join(__dirname, 'examples/get_feature_settings.yaml'),
        },
      },
      errorHandler(logger)(async (context, _request, response) => {
        const soClient = (await context.core).savedObjects.getClient({
          includedHiddenTypes: [INFERENCE_SETTINGS_SO_TYPE],
        });
        const { settings } = await loadSettings(soClient);
        return response.ok({ body: settings });
      })
    );

  router.versioned
    .put({
      access: 'public',
      path: APIRoutes.PUT_FEATURE_SETTINGS,
      summary: 'Replace feature settings',
      description:
        'Replaces the model assignments for every AI feature in the current space. Send the document returned by Get feature settings to round-trip parameters, including reasoning effort.',
      operationId: 'PutFeatureSettings',
      security: manageSecurity,
      options: publicRouteOptions,
    })
    .addVersion(
      {
        version: FEATURE_SETTINGS_API_VERSION,
        security: manageSecurity,
        validate: {
          request: {
            body: inferenceSettingsSchemaV2,
          },
          response: {
            200: {
              body: () => inferenceSettingsSchemaV2,
              description: 'The feature settings that were saved.',
            },
          },
        },
        options: {
          oasOperationObject: () => join(__dirname, 'examples/put_feature_settings.yaml'),
        },
      },
      errorHandler(logger)(async (context, request, response) => {
        const soClient = (await context.core).savedObjects.getClient({
          includedHiddenTypes: [INFERENCE_SETTINGS_SO_TYPE],
        });
        const { settings: saved, version } = await loadSettings(soClient);
        const savedFeatureIds = new Set(saved.features.map((feature) => feature.feature_id));
        const settings = request.body;

        const errors = [
          ...validateFeatureIds(
            settings.features.map((feature) => feature.feature_id),
            (featureId) => isAllowedFeatureId(featureId, featureRegistry, savedFeatureIds)
          ),
          ...validateInferenceSettings(settings),
        ];
        if (errors.length === 0) {
          errors.push(
            ...(await validateEndpointParameters(
              settings,
              (id) => getConnectorById(id, request),
              logger
            ))
          );
        }
        if (errors.length > 0) {
          return response.badRequest({ body: invalidSettingsBody(errors) });
        }

        const savedSettings = await saveSettings(soClient, settings, version);
        return response.ok({ body: savedSettings });
      })
    );

  router.versioned
    .put({
      access: 'public',
      path: APIRoutes.PUT_FEATURE_SETTING,
      summary: 'Update one feature setting',
      description:
        'Replaces the models assigned to one AI feature in the current space and leaves the other features unchanged. The response is the full feature settings document.',
      operationId: 'PutFeatureSetting',
      security: manageSecurity,
      options: publicRouteOptions,
    })
    .addVersion(
      {
        version: FEATURE_SETTINGS_API_VERSION,
        security: manageSecurity,
        validate: {
          request: {
            params: featureSettingsFeatureIdSchema,
            body: inferenceFeatureEndpointsSchema,
          },
          response: {
            200: {
              body: () => inferenceSettingsSchemaV2,
              description: 'The feature settings for the current space after the update.',
            },
          },
        },
        options: {
          oasOperationObject: () => join(__dirname, 'examples/put_feature_setting.yaml'),
        },
      },
      errorHandler(logger)(async (context, request, response) => {
        const soClient = (await context.core).savedObjects.getClient({
          includedHiddenTypes: [INFERENCE_SETTINGS_SO_TYPE],
        });
        const { settings: saved, version } = await loadSettings(soClient);
        const savedFeatureIds = new Set(saved.features.map((feature) => feature.feature_id));
        const { feature_id: featureId } = request.params;

        const unknownFeatureErrors = validateFeatureIds([featureId], (id) =>
          isAllowedFeatureId(id, featureRegistry, savedFeatureIds)
        );
        if (unknownFeatureErrors.length > 0) {
          return response.badRequest({ body: invalidSettingsBody(unknownFeatureErrors) });
        }

        const { endpoints } = request.body;
        const updatedFeature = { features: [{ feature_id: featureId, endpoints }] };
        const errors = validateInferenceSettings(updatedFeature);
        if (errors.length === 0) {
          errors.push(
            ...(await validateEndpointParameters(
              updatedFeature,
              (id) => getConnectorById(id, request),
              logger
            ))
          );
        }
        if (errors.length > 0) {
          return response.badRequest({ body: invalidSettingsBody(errors) });
        }

        const settings = mergeFeature(saved, featureId, endpoints);
        const savedSettings = await saveSettings(soClient, settings, version);
        return response.ok({ body: savedSettings });
      })
    );
};
