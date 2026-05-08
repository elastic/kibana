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
      errorHandler(logger)(async (_context, _request, response) => {
        const body: InferenceFeaturesResponse = {
          features: featureRegistry.getAll(),
        };

        return response.ok({
          body,
          headers: { 'content-type': 'application/json' },
        });
      })
    );
};
