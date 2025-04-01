/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ReservedPrivilegesSet } from '@kbn/core/server';
import { RouteOptions } from '.';
import { CLOUD_DATA_SAVED_OBJECT_TYPE } from '../saved_objects';
import { persistTokenCloudData } from '../cloud_data';

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

        try {
          await persistTokenCloudData(savedObjectsClient, {
            returnError: true,
            solutionType: request.body.onboardingData.solutionType,
            onboardingToken: request.body.onboardingData.token,
          });
        } catch (error) {
          return response.customError(error);
        }

        return response.ok();
      }
    );
};
