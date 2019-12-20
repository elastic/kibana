/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMKibanaRouteWrapper } from './types';
import { savedObjectsAdapter } from '../lib/adapters/saved_objects';

export const uptimeRouteWrapper: UMKibanaRouteWrapper = uptimeRoute => {
  return {
    ...uptimeRoute,
    handler: async (context, request, response) => {
      const { callAsCurrentUser: callES } = context.core.elasticsearch.dataClient;
      const { client: savedObjectsClient } = context.core.savedObjects;
      const dynamicSettings = await savedObjectsAdapter.getUptimeDynamicSettings(
        savedObjectsClient,
        undefined
      );
      return await uptimeRoute.handler(
        { callES, savedObjectsClient, dynamicSettings },
        context,
        request,
        response
      );
    },
  };
};
