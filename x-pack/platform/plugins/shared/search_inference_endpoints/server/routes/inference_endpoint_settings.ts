/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  INFERENCE_ENDPOINT_SETTINGS_SO_TYPE,
  INFERENCE_ENDPOINT_SETTINGS_ID,
  PLUGIN_ID,
  ROUTE_VERSIONS,
} from '../../common/constants';
import type {
  InferenceEndpointSettingsAttributes,
  InferenceEndpointSettingsResponse,
} from '../../common/types';
import { APIRoutes } from '../../common/types';
import { inferenceEndpointSettingsSchemaV1 } from '../saved_objects/schema/v1';
import { errorHandler } from '../utils/error_handler';
import {
  parseInferenceEndpointSettingsSO,
  validateInferenceEndpointSettings,
} from '../utils/inference_endpoint_settings';

const EMPTY_SETTINGS: InferenceEndpointSettingsResponse = {
  _meta: { id: INFERENCE_ENDPOINT_SETTINGS_ID },
  data: { features: [] },
};

export const defineInferenceEndpointSettingsRoutes = ({
  logger,
  router,
}: {
  logger: Logger;
  router: IRouter;
}) => {
  router.versioned
    .get({
      access: 'internal',
      path: APIRoutes.GET_INFERENCE_ENDPOINT_SETTINGS,
      security: {
        authz: {
          requiredPrivileges: [PLUGIN_ID],
        },
      },
    })
    .addVersion(
      {
        security: {
          authz: {
            requiredPrivileges: [PLUGIN_ID],
          },
        },
        validate: {},
        version: ROUTE_VERSIONS.v1,
      },
      errorHandler(logger)(async (context, _request, response) => {
        const soClient = (await context.core).savedObjects.getClient({
          includedHiddenTypes: [INFERENCE_ENDPOINT_SETTINGS_SO_TYPE],
        });

        try {
          const so = await soClient.get<InferenceEndpointSettingsAttributes>(
            INFERENCE_ENDPOINT_SETTINGS_SO_TYPE,
            INFERENCE_ENDPOINT_SETTINGS_ID
          );
          const body: InferenceEndpointSettingsResponse = parseInferenceEndpointSettingsSO(so);
          return response.ok({
            body,
            headers: { 'content-type': 'application/json' },
          });
        } catch (e) {
          if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
            return response.ok({
              body: EMPTY_SETTINGS,
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
      path: APIRoutes.PUT_INFERENCE_ENDPOINT_SETTINGS,
      security: {
        authz: {
          requiredPrivileges: [PLUGIN_ID],
        },
      },
    })
    .addVersion(
      {
        security: {
          authz: {
            requiredPrivileges: [PLUGIN_ID],
          },
        },
        validate: {
          request: {
            body: inferenceEndpointSettingsSchemaV1,
          },
        },
        version: ROUTE_VERSIONS.v1,
      },
      errorHandler(logger)(async (context, request, response) => {
        const attrs = request.body as InferenceEndpointSettingsAttributes;

        const validationErrors = validateInferenceEndpointSettings(attrs);
        if (validationErrors.length > 0) {
          return response.badRequest({
            body: {
              message: 'Invalid inference endpoint settings',
              attributes: { errors: validationErrors },
            },
          });
        }

        const soClient = (await context.core).savedObjects.getClient({
          includedHiddenTypes: [INFERENCE_ENDPOINT_SETTINGS_SO_TYPE],
        });

        const so = await soClient.create<InferenceEndpointSettingsAttributes>(
          INFERENCE_ENDPOINT_SETTINGS_SO_TYPE,
          attrs,
          { id: INFERENCE_ENDPOINT_SETTINGS_ID, overwrite: true }
        );

        const body: InferenceEndpointSettingsResponse = parseInferenceEndpointSettingsSO(so);
        return response.ok({
          body,
          headers: { 'content-type': 'application/json' },
        });
      })
    );
};
