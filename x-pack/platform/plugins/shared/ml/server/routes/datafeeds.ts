/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ML_INTERNAL_BASE_PATH } from '../../common/constants/app';
import { wrapError } from '../client/error_wrapper';
import type { RouteInitialization } from '../types';
import {
  startDatafeedSchema,
  datafeedConfigSchema,
  datafeedIdSchema,
  deleteDatafeedQuerySchema,
} from './schemas/datafeeds_schema';
import { getAuthorizationHeader } from '../lib/request_authorization';

/**
 * Routes for datafeed service
 */
export function dataFeedRoutes({ router, routeGuard }: RouteInitialization) {
  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/datafeeds`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canGetDatafeeds'],
        },
      },
      summary: 'Gets all datafeeds',
      description: 'Retrieves configuration information for datafeeds.',
    })
    .addVersion(
      {
        version: '1',
        validate: false,
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, response }) => {
        try {
          const body = await mlClient.getDatafeeds();
          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/datafeeds/{datafeedId}`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canGetDatafeeds'],
        },
      },
      summary: 'Get datafeed for given datafeed id',
      description: 'Retrieves configuration information for a datafeed.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: datafeedIdSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const datafeedId = request.params.datafeedId;
          const body = await mlClient.getDatafeeds({ datafeed_id: datafeedId });

          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/datafeeds/_stats`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canGetDatafeeds'],
        },
      },
      summary: 'Gets stats for all datafeeds',
      description: 'Retrieves usage information for datafeeds.',
    })
    .addVersion(
      {
        version: '1',
        validate: false,
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, response }) => {
        try {
          const body = await mlClient.getDatafeedStats();
          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/datafeeds/{datafeedId}/_stats`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canGetDatafeeds'],
        },
      },
      summary: 'Get datafeed stats for given datafeed id',
      description: 'Retrieves usage information for a datafeed.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: datafeedIdSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const datafeedId = request.params.datafeedId;
          const body = await mlClient.getDatafeedStats({
            datafeed_id: datafeedId,
          });

          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .put({
      path: `${ML_INTERNAL_BASE_PATH}/datafeeds/{datafeedId}`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canCreateDatafeed'],
        },
      },
      summary: 'Creates a datafeed',
      description: 'Instantiates a datafeed.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: datafeedIdSchema,
            body: datafeedConfigSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const datafeedId = request.params.datafeedId;
          const body = await mlClient.putDatafeed(
            {
              datafeed_id: datafeedId,
              // @ts-expect-error type mismatch for `time_span` (string | number versus estypes.Duration)
              body: request.body,
            },
            getAuthorizationHeader(request)
          );

          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/datafeeds/{datafeedId}/_update`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canUpdateDatafeed'],
        },
      },
      summary: 'Updates a datafeed',
      description: 'Updates certain properties of a datafeed.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: datafeedIdSchema,
            body: datafeedConfigSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const datafeedId = request.params.datafeedId;
          const body = await mlClient.updateDatafeed(
            {
              datafeed_id: datafeedId,
              // @ts-expect-error type mismatch for `time_span` (string | number versus estypes.Duration)
              body: request.body,
            },
            getAuthorizationHeader(request)
          );

          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .delete({
      path: `${ML_INTERNAL_BASE_PATH}/datafeeds/{datafeedId}`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canDeleteDatafeed'],
        },
      },
      summary: 'Deletes a datafeed',
      description: 'Deletes an existing datafeed.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: datafeedIdSchema,
            query: deleteDatafeedQuerySchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const options: estypes.MlDeleteDatafeedRequest = {
            datafeed_id: request.params.datafeedId,
          };
          const force = request.query.force;
          if (force !== undefined) {
            options.force = force;
          }

          const body = await mlClient.deleteDatafeed(options);

          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/datafeeds/{datafeedId}/_start`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canStartStopDatafeed'],
        },
      },
      summary: 'Starts a datafeed',
      description: 'Starts one or more datafeeds',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: datafeedIdSchema,
            body: startDatafeedSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const datafeedId = request.params.datafeedId;
          const { start, end } = request.body;

          const body = await mlClient.startDatafeed({
            datafeed_id: datafeedId,
            body: {
              start: start !== undefined ? String(start) : undefined,
              end: end !== undefined ? String(end) : undefined,
            },
          });

          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/datafeeds/{datafeedId}/_stop`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canStartStopDatafeed'],
        },
      },
      summary: 'Stops a datafeed',
      description: 'Stops one or more datafeeds',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: datafeedIdSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const datafeedId = request.params.datafeedId;

          const body = await mlClient.stopDatafeed({
            datafeed_id: datafeedId,
          });

          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/datafeeds/{datafeedId}/_preview`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canPreviewDatafeed'],
        },
      },
      summary: 'Previews a datafeed',
      description: 'Previews a datafeed',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: datafeedIdSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const datafeedId = request.params.datafeedId;
          const body = await mlClient.previewDatafeed(
            {
              datafeed_id: datafeedId,
            },
            { ...getAuthorizationHeader(request), maxRetries: 0 }
          );

          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );
}
