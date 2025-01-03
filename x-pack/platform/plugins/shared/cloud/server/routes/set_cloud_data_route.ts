/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ReservedPrivilegesSet, SavedObjectsErrorHelpers } from '@kbn/core/server';
import { RouteOptions } from '.';
import { CLOUD_DATA_SAVED_OBJECT_ID } from './constants';
import { CLOUD_DATA_SAVED_OBJECT_TYPE } from '../saved_objects';
import { CloudDataAttributes } from './types';

const createBodySchemaV1 = schema.object({
  onboardingData: schema.object({
    solutionType: schema.oneOf([
      schema.literal('security'),
      schema.literal('observability'),
      schema.literal('search'),
      schema.literal('elasticsearch'),
    ]),
    token: schema.string(),
  }),
});

export const setPostCloudSolutionDataRoute = ({ router }: RouteOptions) => {
  router.versioned
    .post({
      path: `/internal/cloud/solution`,
      access: 'internal',
      summary: 'Save cloud data for solutions',
      security: {
        authz: {
          requiredPrivileges: [ReservedPrivilegesSet.superuser],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: createBodySchemaV1,
          },
        },
      },
      async (context, request, response) => {
        const coreContext = await context.core;
        const savedObjectsClient = coreContext.savedObjects.getClient({
          includedHiddenTypes: [CLOUD_DATA_SAVED_OBJECT_TYPE],
        });
        let cloudDataSo = null;
        try {
          cloudDataSo = await savedObjectsClient.get<CloudDataAttributes>(
            CLOUD_DATA_SAVED_OBJECT_TYPE,
            CLOUD_DATA_SAVED_OBJECT_ID
          );
        } catch (error) {
          if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
            cloudDataSo = null;
          } else {
            return response.customError(error);
          }
        }

        try {
          if (cloudDataSo === null) {
            await savedObjectsClient.create<CloudDataAttributes>(
              CLOUD_DATA_SAVED_OBJECT_TYPE,
              {
                onboardingData: request.body.onboardingData,
              },
              { id: CLOUD_DATA_SAVED_OBJECT_ID }
            );
          } else {
            await savedObjectsClient.update<CloudDataAttributes>(
              CLOUD_DATA_SAVED_OBJECT_TYPE,
              CLOUD_DATA_SAVED_OBJECT_ID,
              {
                onboardingData: request.body.onboardingData,
              }
            );
          }
        } catch (error) {
          return response.badRequest(error);
        }

        return response.ok();
      }
    );
};
