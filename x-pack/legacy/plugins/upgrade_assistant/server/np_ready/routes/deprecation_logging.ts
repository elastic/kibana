/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

import {
  getDeprecationLoggingStatus,
  setDeprecationLogging,
} from '../lib/es_deprecation_logging_apis';
import { versionCheckHandlerWrapper } from '../lib/es_version_precheck';
import { ServerShimWithRouter } from '../types';
import { createRequestShim } from './create_request_shim';

export function registerDeprecationLoggingRoutes(server: ServerShimWithRouter) {
  const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');

  server.router.get(
    {
      path: '/api/upgrade_assistant/deprecation_logging',
      validate: false,
    },
    versionCheckHandlerWrapper(async (ctx, request, response) => {
      const reqShim = createRequestShim(request);
      try {
        const result = await getDeprecationLoggingStatus(callWithRequest, reqShim);
        return response.ok({ body: result });
      } catch (e) {
        return response.internalError({ body: e });
      }
    })
  );

  server.router.put(
    {
      path: '/api/upgrade_assistant/deprecation_logging',
      validate: {
        body: schema.object({
          isEnabled: schema.boolean(),
        }),
      },
    },
    versionCheckHandlerWrapper(async (ctx, request, response) => {
      const reqShim = createRequestShim(request);
      try {
        const { isEnabled } = reqShim.payload as { isEnabled: boolean };
        return response.ok({
          body: await setDeprecationLogging(callWithRequest, reqShim, isEnabled),
        });
      } catch (e) {
        return response.internalError({ body: e });
      }
    })
  );
}
