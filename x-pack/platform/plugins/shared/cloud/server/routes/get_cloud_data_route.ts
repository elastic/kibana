/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteOptions } from '.';
import { CLOUD_DATA_SAVED_OBJECT_ID } from './constants';
import { CLOUD_DATA_SAVED_OBJECT_TYPE } from '../saved_objects';
import { CloudDataAttributes } from '../../common/types';

export const setGetCloudSolutionDataRoute = ({ router }: RouteOptions) => {
  router.versioned
    .get({
      path: `/internal/cloud/solution`,
      access: 'internal',
      summary: 'Get cloud data for solutions',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {},
        },
      },
      async (context, request, response) => {
        const coreContext = await context.core;
        const savedObjectsClient = coreContext.savedObjects.getClient({
          includedHiddenTypes: [CLOUD_DATA_SAVED_OBJECT_TYPE],
        });
        try {
          const cloudDataSo = await savedObjectsClient.get<CloudDataAttributes>(
            CLOUD_DATA_SAVED_OBJECT_TYPE,
            CLOUD_DATA_SAVED_OBJECT_ID
          );
          return response.ok({ body: cloudDataSo?.attributes ?? null });
        } catch (error) {
          return response.customError(error);
        }
      }
    );
};
