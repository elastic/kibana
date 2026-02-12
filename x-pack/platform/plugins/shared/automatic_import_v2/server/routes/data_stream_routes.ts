/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { AutomaticImportV2PluginRequestHandlerContext } from '../types';
import { buildAutomaticImportResponse } from './utils';
import { AUTOMATIC_IMPORT_API_PRIVILEGES } from '../feature';
import {
  UploadSamplesToDataStreamRequestBody,
  UploadSamplesToDataStreamRequestParams,
  DeleteDataStreamRequestParams,
  ReanalyzeDataStreamRequestParams,
  ReanalyzeDataStreamRequestBody,
} from '../../common';

export const registerDataStreamRoutes = (
  router: IRouter<AutomaticImportV2PluginRequestHandlerContext>,
  logger: Logger
) => {
  uploadSamplesRoute(router, logger);
  deleteDataStreamRoute(router, logger);
  getDataStreamResultsRoute(router, logger);
  reanalyzeDataStreamRoute(router, logger);
};

const uploadSamplesRoute = (
  router: IRouter<AutomaticImportV2PluginRequestHandlerContext>,
  logger: Logger
) =>
  router.versioned
    .post({
      access: 'internal',
      path: '/api/automatic_import_v2/integrations/{integration_id}/data_streams/{data_stream_id}/upload',
      security: {
        authz: {
          requiredPrivileges: [`${AUTOMATIC_IMPORT_API_PRIVILEGES.MANAGE}`],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(UploadSamplesToDataStreamRequestParams),
            body: buildRouteValidationWithZod(UploadSamplesToDataStreamRequestBody),
          },
        },
      },
      async (context, request, response) => {
        try {
          const automaticImportv2 = await context.automaticImportv2;
          const automaticImportService = automaticImportv2.automaticImportService;
          const currentUser = await automaticImportv2.getCurrentUser();
          const esClient = automaticImportv2.esClient;
          const { integration_id: integrationId, data_stream_id: dataStreamId } = request.params;
          const { samples, originalSource } = request.body;
          const result = await automaticImportService.addSamplesToDataStream({
            integrationId,
            dataStreamId,
            rawSamples: samples,
            originalSource,
            authenticatedUser: currentUser,
            esClient,
          });
          return response.ok({ body: result });
        } catch (err) {
          logger.error(`registerDataStreamRoutes: Caught error:`, err);
          const automaticImportResponse = buildAutomaticImportResponse(response);
          return automaticImportResponse.error({
            statusCode: 500,
            body: err,
          });
        }
      }
    );

const deleteDataStreamRoute = (
  router: IRouter<AutomaticImportV2PluginRequestHandlerContext>,
  logger: Logger
) =>
  router.versioned
    .delete({
      access: 'internal',
      path: '/api/automatic_import_v2/integrations/{integration_id}/data_streams/{data_stream_id}',
      security: {
        authz: {
          requiredPrivileges: [`${AUTOMATIC_IMPORT_API_PRIVILEGES.MANAGE}`],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(DeleteDataStreamRequestParams),
          },
        },
      },
      async (context, request, response) => {
        try {
          const automaticImportv2 = await context.automaticImportv2;
          const automaticImportService = automaticImportv2.automaticImportService;
          const { integration_id: integrationId, data_stream_id: dataStreamId } = request.params;
          const esClient = automaticImportv2.esClient;
          await automaticImportService.deleteDataStream(integrationId, dataStreamId, esClient);
          return response.ok();
        } catch (err) {
          logger.error(`deleteDataStreamRoute: Caught error:`, err);
          const automaticImportResponse = buildAutomaticImportResponse(response);
          return automaticImportResponse.error({
            statusCode: 500,
            body: err,
          });
        }
      }
    );

const getDataStreamResultsRoute = (
  router: IRouter<AutomaticImportV2PluginRequestHandlerContext>,
  logger: Logger
) =>
  router.versioned
    .get({
      access: 'internal',
      path: '/api/automatic_import_v2/integrations/{integration_id}/data_streams/{data_stream_id}/results',
      security: {
        authz: {
          requiredPrivileges: [`${AUTOMATIC_IMPORT_API_PRIVILEGES.READ}`],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(DeleteDataStreamRequestParams),
          },
        },
      },
      async (context, request, response) => {
        try {
          const automaticImportv2 = await context.automaticImportv2;
          const automaticImportService = automaticImportv2.automaticImportService;
          const { integration_id: integrationId, data_stream_id: dataStreamId } = request.params;
          const result = await automaticImportService.getDataStreamResults(
            integrationId,
            dataStreamId
          );
          return response.ok({ body: result });
        } catch (err) {
          logger.error(`getDataStreamResultsRoute: Caught error:`, err);
          const automaticImportResponse = buildAutomaticImportResponse(response);
          const message = err instanceof Error ? err.message : String(err);
          const statusCode =
            message.includes('has not completed yet') ||
            message.includes('failed and has no results')
              ? 400
              : 500;
          return automaticImportResponse.error({ statusCode, body: err });
        }
      }
    );

const reanalyzeDataStreamRoute = (
  router: IRouter<AutomaticImportV2PluginRequestHandlerContext>,
  logger: Logger
) =>
  router.versioned
    .put({
      access: 'internal',
      path: '/api/automatic_import_v2/integrations/{integration_id}/data_streams/{data_stream_id}/reanalyze',
      security: {
        authz: {
          requiredPrivileges: [`${AUTOMATIC_IMPORT_API_PRIVILEGES.MANAGE}`],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(ReanalyzeDataStreamRequestParams),
            body: buildRouteValidationWithZod(ReanalyzeDataStreamRequestBody),
          },
        },
      },
      async (context, request, response) => {
        try {
          const automaticImportv2 = await context.automaticImportv2;
          const automaticImportService = automaticImportv2.automaticImportService;
          const { integration_id: integrationId, data_stream_id: dataStreamId } = request.params;
          const { connectorId, langSmithOptions } = request.body;

          await automaticImportService.reanalyzeDataStream(
            {
              integrationId,
              dataStreamId,
              connectorId,
              langSmithOptions,
            },
            request
          );

          return response.ok({ body: { success: true } });
        } catch (err) {
          logger.error(`reanalyzeDataStreamRoute: Caught error:`, err);
          const automaticImportResponse = buildAutomaticImportResponse(response);
          return automaticImportResponse.error({
            statusCode: 500,
            body: err,
          });
        }
      }
    );
