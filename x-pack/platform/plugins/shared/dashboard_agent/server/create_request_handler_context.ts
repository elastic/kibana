/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandlerContext } from '@kbn/core/server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

export const createRequestHandlerContext = (
  savedObjectsClient: SavedObjectsClientContract
): RequestHandlerContext =>
  ({
    resolve: async () => ({
      core: {
        savedObjects: {
          client: savedObjectsClient,
        },
      },
    }),
  } as unknown as RequestHandlerContext);
