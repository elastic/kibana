/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, KibanaRequest, Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { ApiPrivileges } from '@kbn/core-security-server';
import { i18n } from '@kbn/i18n';
import type { InferenceConnector } from '@kbn/inference-common';
import {
  INFERENCE_SETTINGS_SO_TYPE,
  INFERENCE_SETTINGS_ID,
  PLUGIN_ID,
  ROUTE_VERSIONS,
} from '../../common/constants';
import type { InferenceSettingsAttributes, InferenceSettingsResponse } from '../../common/types';
import { APIRoutes } from '../../common/types';
import { inferenceSettingsSchemaV1 } from '../saved_objects/schema/v1';
import type { InferenceFeatureRegistry } from '../inference_feature_registry';
import { resolveFeatureEndpointIds } from '../inference_endpoints';
import { errorHandler } from '../utils/error_handler';
import { parseInferenceSettingsSO, validateInferenceSettings } from '../utils/inference_settings';

const EMPTY_SETTINGS: InferenceSettingsResponse = {
  _meta: { id: INFERENCE_SETTINGS_ID },
  data: { features: [] },
};

const resolveAllEndpointIds = (
  settings: InferenceSettingsAttributes,
  featureRegistry: InferenceFeatureRegistry,
  logger: Logger
): string[] => {
  const soFeaturesMap = new Map(settings.features.map((f) => [f.feature_id, f]));

  const resolvedEndpointIds = featureRegistry
    .getAll()
    .filter((f) => f.parentFeatureId !== undefined)
    .flatMap(
      (f) => resolveFeatureEndpointIds(featureRegistry, soFeaturesMap, f.featureId, logger).ids
    );

  return [...new Set(resolvedEndpointIds)];
};

const findInvalidEndpoints = async (
  ids: string[],
  checkConnector: (id: string) => Promise<InferenceConnector>
): Promise<string[]> => {
  const invalid: string[] = [];
  for (const id of ids) {
    try {
      await checkConnector(id);
    } catch {
      invalid.push(id);
    }
  }
  return invalid;
};

export const defineInferenceSettingsRoutes = ({
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
      errorHandler(logger)(async (context, request, response) => {
        const coreContext = await context.core;
        const soClient = coreContext.savedObjects.getClient({
          includedHiddenTypes: [INFERENCE_SETTINGS_SO_TYPE],
        });

        let settingsBody: InferenceSettingsResponse;
        try {
          const so = await soClient.get<InferenceSettingsAttributes>(
            INFERENCE_SETTINGS_SO_TYPE,
            INFERENCE_SETTINGS_ID
          );

          if (so.error) {
            if (so.error.statusCode === 404) {
              return response.ok({
                body: EMPTY_SETTINGS,
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

          settingsBody = parseInferenceSettingsSO(so);
        } catch (e) {
          if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
            return response.ok({
              body: EMPTY_SETTINGS,
              headers: { 'content-type': 'application/json' },
            });
          }
          throw e;
        }

        let invalidEndpoints: string[] = [];

        if (settingsBody.data.features.length > 0) {
          try {
            const ids = resolveAllEndpointIds(settingsBody.data, featureRegistry, logger);
            invalidEndpoints = await findInvalidEndpoints(ids, (id) =>
              getConnectorById(id, request)
            );
          } catch (e) {
            logger.warn(`Failed to validate inference endpoints: ${e.message}`);
          }
        }

        return response.ok({
          body: { ...settingsBody, invalidEndpoints },
          headers: { 'content-type': 'application/json' },
        });
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
