/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { RouteInitialization } from '../types';
import { wrapError } from '../client/error_wrapper';
import { ML_INTERNAL_BASE_PATH } from '../../common/constants/app';

export function inferenceModelRoutes(
  { router, routeGuard, getEnabledFeatures }: RouteInitialization,
  cloud: CloudSetup
) {
  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/_inference/all`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canGetTrainedModels'],
        },
      },
      summary: 'Get all inference endpoints',
      description: 'Get all inference endpoints',
    })
    .addVersion(
      {
        version: '1',
        validate: false,
      },
      routeGuard.fullLicenseAPIGuard(async ({ client, response }) => {
        try {
          const body = await client.asCurrentUser.inference.get({
            inference_id: '_all',
          });
          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );
}
