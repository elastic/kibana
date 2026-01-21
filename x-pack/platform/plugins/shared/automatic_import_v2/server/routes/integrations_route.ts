/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { AutomaticImportV2PluginRequestHandlerContext } from '../types';
import type {
  CreateAutoImportIntegrationResponse,
  GetAllAutoImportIntegrationsResponse,
  GetAutoImportIntegrationResponse,
  AllIntegrationsResponseIntegration,
  IntegrationResponse,
} from '../../common';
import {
  CreateAutoImportIntegrationRequestBody,
  GetAutoImportIntegrationRequestParams,
} from '../../common';
import { buildAutomaticImportResponse } from './utils';
import type { IntegrationParams, DataStreamParams } from './types';
import { AUTOMATIC_IMPORT_API_PRIVILEGES } from '../feature';

export const registerIntegrationRoutes = (
  router: IRouter<AutomaticImportV2PluginRequestHandlerContext>,
  logger: Logger
) => {
  getAllIntegrationsRoute(router, logger);
  getIntegrationByIdRoute(router, logger);
  createIntegrationRoute(router, logger);
};

const getAllIntegrationsRoute = (
  router: IRouter<AutomaticImportV2PluginRequestHandlerContext>,
  logger: Logger
) =>
  router.versioned
    .get({
      access: 'internal',
      path: '/api/automatic_import_v2/integrations',
      security: {
        authz: {
          requiredPrivileges: [`${AUTOMATIC_IMPORT_API_PRIVILEGES.READ}`],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: false,
      },
      async (context, _, response) => {
        try {
          const automaticImportv2 = await context.automaticImportv2;
          const automaticImportService = automaticImportv2.automaticImportService;
          const integrationResponses: IntegrationResponse[] =
            await automaticImportService.getAllIntegrations();
          const body: GetAllAutoImportIntegrationsResponse = integrationResponses.map(
            (integration) => ({
              integrationId: integration.integrationId,
              title: integration.title,
              totalDataStreamCount: integration.dataStreams.length,
              successfulDataStreamCount: integration.dataStreams.filter(
                (dataStream) => dataStream.status === 'completed'
              ).length,
              status: integration.status,
            })
          ) as AllIntegrationsResponseIntegration[];
          return response.ok({ body });
        } catch (err) {
          logger.error(`registerIntegrationRoutes: Caught error:`, err);
          const automaticImportResponse = buildAutomaticImportResponse(response);
          return automaticImportResponse.error({
            statusCode: 500,
            body: err,
          });
        }
      }
    );

const getIntegrationByIdRoute = (
  router: IRouter<AutomaticImportV2PluginRequestHandlerContext>,
  logger: Logger
) =>
  router.versioned
    .get({
      access: 'internal',
      path: '/api/automatic_import_v2/integrations/{integration_id}',
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
            params: buildRouteValidationWithZod(GetAutoImportIntegrationRequestParams),
          },
        },
      },
      async (context, request, response) => {
        try {
          const automaticImportv2 = await context.automaticImportv2;
          const automaticImportService = automaticImportv2.automaticImportService;
          const { integration_id: integrationId } = request.params;
          const integration = await automaticImportService.getIntegrationById(integrationId);
          const body: GetAutoImportIntegrationResponse = { integrationResponse: integration };
          return response.ok({ body });
        } catch (err) {
          logger.error(`getIntegrationByIdRoute: Caught error:`, err);
          const automaticImportResponse = buildAutomaticImportResponse(response);
          const statusCode = SavedObjectsErrorHelpers.isNotFoundError(err) ? 404 : 500;
          return automaticImportResponse.error({
            statusCode,
            body: err,
          });
        }
      }
    );

const createIntegrationRoute = (
  router: IRouter<AutomaticImportV2PluginRequestHandlerContext>,
  logger: Logger
) =>
  router.versioned
    .put({
      access: 'internal',
      path: '/api/automatic_import_v2/integrations',
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
            body: buildRouteValidationWithZod(CreateAutoImportIntegrationRequestBody),
          },
        },
      },
      async (context, request, response) => {
        const { automaticImportService, getCurrentUser, esClient } =
          await context.automaticImportv2;
        const { integrationId, title, logo, description, connectorId, dataStreams } = request.body;
        try {
          const authenticatedUser = await getCurrentUser();

          const integrationParams: IntegrationParams = {
            integrationId,
            title,
            logo,
            description,
          };

          await automaticImportService.createIntegration({ authenticatedUser, integrationParams });

          if (dataStreams) {
            const dataStreamsParams: DataStreamParams[] = dataStreams.map((dataStream) => ({
              ...dataStream,
              integrationId,
              metadata: { createdAt: new Date().toISOString() },
            }));
            await Promise.all(
              dataStreamsParams.map((dataStreamParams) =>
                automaticImportService.createDataStream(
                  {
                    authenticatedUser,
                    dataStreamParams,
                    esClient,
                    connectorId,
                  },
                  request
                )
              )
            );
          }

          const body: CreateAutoImportIntegrationResponse = {
            integration_id: integrationId,
          };
          return response.ok({ body });
        } catch (err) {
          await automaticImportService.deleteIntegration(integrationId);
          logger.error(`createIntegrationRoute: Caught error:`, err);
          const automaticImportResponse = buildAutomaticImportResponse(response);
          return automaticImportResponse.error({
            statusCode: 500,
            body: err,
          });
        }
      }
    );
