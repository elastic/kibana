/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import type { AutomaticImportPluginRequestHandlerContext } from '../types';
import type {
  CreateAutoImportIntegrationResponse,
  GetAllAutoImportIntegrationsResponse,
  GetAutoImportIntegrationResponse,
  AllIntegrationsResponseIntegration,
  IntegrationResponse,
} from '../../common';
import {
  AutomaticImportTelemetryEventType,
  ApproveAutoImportIntegrationRequestBody,
  ApproveAutoImportIntegrationRequestParams,
  CreateAutoImportIntegrationRequestBody,
  DeleteAutoImportIntegrationRequestParams,
  DownloadAutoImportIntegrationRequestParams,
  DownloadAutoImportIntegrationRequestQuery,
  DownloadIntentEnum,
  GetAutoImportIntegrationRequestParams,
} from '../../common';
import { buildAutomaticImportResponse } from './utils';
import type { IntegrationParams, DataStreamParams } from './types';
import { AUTOMATIC_IMPORT_API_PRIVILEGES } from '../feature';
import { withAvailability } from './with_availability';

export const registerIntegrationRoutes = (
  router: IRouter<AutomaticImportPluginRequestHandlerContext>,
  logger: Logger
) => {
  getAllIntegrationsRoute(router, logger);
  getIntegrationByIdRoute(router, logger);
  createIntegrationRoute(router, logger);
  approveIntegrationRoute(router, logger);
  deleteIntegrationRoute(router, logger);
  downloadIntegrationRoute(router, logger);
};

const getAllIntegrationsRoute = (
  router: IRouter<AutomaticImportPluginRequestHandlerContext>,
  logger: Logger
) =>
  router.versioned
    .get({
      access: 'internal',
      path: '/api/automatic_import/integrations',
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
      withAvailability(async (context, _, response) => {
        try {
          const automaticImport = await context.automaticImport;
          const automaticImportService = automaticImport.automaticImportService;
          const integrationResponses: IntegrationResponse[] =
            await automaticImportService.getAllIntegrations();
          const body: GetAllAutoImportIntegrationsResponse = integrationResponses.map(
            (integration) => ({
              integrationId: integration.integrationId,
              title: integration.title,
              logo: integration.logo,
              totalDataStreamCount: integration.dataStreams.length,
              successfulDataStreamCount: integration.dataStreams.filter(
                (dataStream) => dataStream.status === 'completed'
              ).length,
              version: integration.version,
              createdBy: integration.createdBy,
              createdByProfileUid: integration.createdByProfileUid,
              status: integration.status,
            })
          ) as AllIntegrationsResponseIntegration[];
          return response.ok({ body });
        } catch (err) {
          logger.error(`registerIntegrationRoutes: Caught error:`, err);
          const automaticImportResponse = buildAutomaticImportResponse(response);
          return automaticImportResponse.error({
            statusCode: 500,
          });
        }
      })
    );

const getIntegrationByIdRoute = (
  router: IRouter<AutomaticImportPluginRequestHandlerContext>,
  logger: Logger
) =>
  router.versioned
    .get({
      access: 'internal',
      path: '/api/automatic_import/integrations/{integration_id}',
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
      withAvailability(async (context, request, response) => {
        try {
          const automaticImport = await context.automaticImport;
          const automaticImportService = automaticImport.automaticImportService;
          const { integration_id: integrationId } = request.params;
          const integration = await automaticImportService.getIntegrationById(integrationId);
          const body: GetAutoImportIntegrationResponse = { integrationResponse: integration };
          return response.ok({ body });
        } catch (err) {
          logger.error(`getIntegrationByIdRoute: Caught error: ${err}`);
          const automaticImportResponse = buildAutomaticImportResponse(response);
          const statusCode = SavedObjectsErrorHelpers.isNotFoundError(err) ? 404 : 500;
          return automaticImportResponse.error({
            statusCode,
            body: statusCode === 404 ? 'Integration not found' : undefined,
          });
        }
      })
    );

const createIntegrationRoute = (
  router: IRouter<AutomaticImportPluginRequestHandlerContext>,
  logger: Logger
) =>
  router.versioned
    .put({
      access: 'internal',
      path: '/api/automatic_import/integrations',
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
      withAvailability(async (context, request, response) => {
        const { automaticImportService, getCurrentUser, esClient } = await context.automaticImport;
        const {
          integrationId,
          title,
          logo,
          description,
          connectorId,
          dataStreams,
          langSmithOptions,
        } = request.body;
        try {
          const authenticatedUser = await getCurrentUser();

          const integrationParams: IntegrationParams = {
            integrationId,
            title,
            logo,
            description,
            connectorId,
          };

          await automaticImportService.createUpdateIntegration({
            authenticatedUser,
            integrationParams,
          });

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
                    langSmithOptions,
                    integrationName: title,
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
          logger.error(`createIntegrationRoute: Caught error: ${err}`);
          const automaticImportResponse = buildAutomaticImportResponse(response);
          return automaticImportResponse.error({
            statusCode: 500,
          });
        }
      })
    );

const approveIntegrationRoute = (
  router: IRouter<AutomaticImportPluginRequestHandlerContext>,
  logger: Logger
) =>
  router.versioned
    .post({
      access: 'internal',
      path: '/api/automatic_import/integrations/{integration_id}/approve',
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
            params: buildRouteValidationWithZod(ApproveAutoImportIntegrationRequestParams),
            body: buildRouteValidationWithZod(ApproveAutoImportIntegrationRequestBody),
          },
        },
      },
      withAvailability(async (context, request, response) => {
        try {
          const { automaticImportService, getCurrentUser } = await context.automaticImport;
          const authenticatedUser = await getCurrentUser();

          const { integration_id: integrationId } = request.params;
          const { version, categories } = request.body;

          await automaticImportService.approveIntegration({
            integrationId,
            authenticatedUser,
            version,
            categories,
          });

          return response.ok({ body: { message: 'Integration approved successfully' } });
        } catch (err) {
          logger.error(`approveIntegrationRoute: Caught error: ${err}`);
          const automaticImportResponse = buildAutomaticImportResponse(response);
          if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
            return automaticImportResponse.error({
              statusCode: 404,
              body: 'Integration not found',
            });
          }
          const rawMessage = err instanceof Error ? err.message : String(err);
          if (rawMessage.includes('no data streams')) {
            return automaticImportResponse.error({
              statusCode: 400,
              body: 'Cannot approve integration with no data streams',
            });
          }
          return automaticImportResponse.error({ statusCode: 500 });
        }
      })
    );

const deleteIntegrationRoute = (
  router: IRouter<AutomaticImportPluginRequestHandlerContext>,
  logger: Logger
) =>
  router.versioned
    .delete({
      access: 'internal',
      path: '/api/automatic_import/integrations/{integration_id}',
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
            params: buildRouteValidationWithZod(DeleteAutoImportIntegrationRequestParams),
          },
        },
      },
      withAvailability(async (context, request, response) => {
        try {
          const { automaticImportService } = await context.automaticImport;
          const { integration_id: integrationId } = request.params;
          const result = await automaticImportService.deleteIntegration(integrationId);

          if (result.errors.length > 0) {
            logger.warn(
              `deleteIntegrationRoute: Integration ${integrationId} deleted with ${result.errors.length} errors`
            );
          }

          return response.ok({
            body: {
              success: result.success,
              dataStreamsDeleted: result.dataStreamsDeleted,
              errors: result.errors,
            },
          });
        } catch (err) {
          logger.error(`deleteIntegrationRoute: Caught error: ${err}`);
          const automaticImportResponse = buildAutomaticImportResponse(response);
          const statusCode = SavedObjectsErrorHelpers.isNotFoundError(err) ? 404 : 500;
          return automaticImportResponse.error({
            statusCode,
            body: statusCode === 404 ? 'Integration not found' : undefined,
          });
        }
      })
    );

const downloadIntegrationRoute = (
  router: IRouter<AutomaticImportPluginRequestHandlerContext>,
  logger: Logger
) =>
  router.versioned
    .get({
      access: 'internal',
      path: '/api/automatic_import/integrations/{integration_id}/download',
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
            params: buildRouteValidationWithZod(DownloadAutoImportIntegrationRequestParams),
            query: buildRouteValidationWithZod(DownloadAutoImportIntegrationRequestQuery),
          },
        },
      },
      withAvailability(async (context, request, response) => {
        try {
          const { automaticImportService, reportTelemetryEvent, fieldsMetadataClient } =
            await context.automaticImport;
          const { integration_id: integrationId } = request.params;
          const { buffer, packageName } = await automaticImportService.buildIntegrationPackage(
            integrationId,
            fieldsMetadataClient
          );

          if (request.query.intent === DownloadIntentEnum.install) {
            try {
              const integration = await automaticImportService.getIntegrationById(integrationId);
              const dataStreams = await automaticImportService.getAllDataStreams(integrationId);

              dataStreams.forEach((ds) => {
                reportTelemetryEvent(AutomaticImportTelemetryEventType.IntegrationInstalled, {
                  sessionId: (request.headers['x-session-id'] as string) || 'unknown',
                  integrationName: integration.title,
                  version: integration.version ?? '',
                  dataStreamCount: dataStreams.length,
                  dataStreamName: ds.title,
                });
              });
            } catch (telemetryError) {
              logger.warn(`Failed to report install telemetry: ${telemetryError}`);
            }
          }

          return response.ok({
            body: buffer,
            headers: {
              'content-type': 'application/zip',
              'content-disposition': `attachment; filename="${packageName}.zip"`,
            },
          });
        } catch (err) {
          logger.error(`downloadIntegrationRoute: Caught error: ${err}`);
          const automaticImportResponse = buildAutomaticImportResponse(response);
          const statusCode = SavedObjectsErrorHelpers.isNotFoundError(err) ? 404 : 500;
          return automaticImportResponse.error({
            statusCode,
            body: statusCode === 404 ? 'Integration not found' : undefined,
          });
        }
      })
    );
