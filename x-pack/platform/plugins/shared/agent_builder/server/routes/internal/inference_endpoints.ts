/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDependencies } from '../types';
import { internalApiPath } from '../../../common/constants';

export function registerInternalInferenceEndpointsRoute({ router }: RouteDependencies) {
  router.get(
    {
      path: `${internalApiPath}/inference_endpoints`,
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
      options: { access: 'internal' },
      validate: {},
    },
    async (context, _request, response) => {
      const coreContext = await context.core;
      const esClient = coreContext.elasticsearch.client.asCurrentUser;

      const { endpoints } = await esClient.inference.get({
        inference_id: '_all',
      });

      return response.ok({
        body: {
          inference_endpoints: endpoints,
        },
      });
    }
  );
}
