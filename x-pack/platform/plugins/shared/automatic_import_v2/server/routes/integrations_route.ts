/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import type { AutomaticImportV2PluginRequestHandlerContext } from '../types';
import type {
  CreateAutoImportIntegrationRequestBody,
  CreateAutoImportIntegrationResponse,
  GetAutoImportIntegrationsResponse,
  GetAutoImportIntegrationResponse,
  GetAutoImportIntegrationRequestParams,
} from '../../common';
import { buildAutomaticImportV2Response } from './utils';

export const registerIntegrationRoutes = (
  router: IRouter<AutomaticImportV2PluginRequestHandlerContext>,
  logger: Logger
) => {
  getAllIntegrationsRoute(router, logger);
  getIntegrationByIdRoute(router, logger);
  addIntegrationRoute(router, logger);
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
          requiredPrivileges: ['securitySolution', 'automaticImportv2'],
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
          const integrations = await automaticImportService.getAllIntegrations();
          const body: GetAutoImportIntegrationsResponse = integrations;
          return response.ok({ body });
        } catch (err) {
          logger.error(`registerIntegrationRoutes: Caught error:`, err);
          const automaticImportV2Response = buildAutomaticImportV2Response(response);
          return automaticImportV2Response.error({
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
          requiredPrivileges: ['securitySolution', 'automaticImportv2'],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: false,
      },
      async (context, request, response) => {
        try {
          const automaticImportv2 = await context.automaticImportv2;
          const automaticImportService = automaticImportv2.automaticImportService;
          const { integration_id: integrationId } =
            request.params as GetAutoImportIntegrationRequestParams;
          const integration = await automaticImportService.getIntegrationById(integrationId);
          const body: GetAutoImportIntegrationResponse = { integration };
          return response.ok({ body });
        } catch (err) {
          logger.error(`getIntegrationByIdRoute: Caught error:`, err);
          const automaticImportV2Response = buildAutomaticImportV2Response(response);
          return automaticImportV2Response.error({
            statusCode: 500,
            body: err,
          });
        }
      }
    );

const addIntegrationRoute = (
  router: IRouter<AutomaticImportV2PluginRequestHandlerContext>,
  logger: Logger
) =>
  router.versioned
    .post({
      access: 'internal',
      path: '/api/automatic_import_v2/integrations',
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', 'automaticImportv2'],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: false,
      },
      async (context, request, response) => {
        try {
          const automaticImportv2 = await context.automaticImportv2;
          const automaticImportService = automaticImportv2.automaticImportService;
          const integrationRequestBody = request.body as CreateAutoImportIntegrationRequestBody;
          const integrationId = createIntegrationId(integrationRequestBody.title);
          const integrationData = {
            integration_id: integrationId,
            dataStreams: integrationRequestBody.dataStreams,
            title: integrationRequestBody.title,
            logo: integrationRequestBody.logo,
            description: integrationRequestBody.description,
          };
          await automaticImportService.insertIntegration(request, integrationData);
          const body: CreateAutoImportIntegrationResponse = { integration_id: integrationId };
          return response.ok({ body });
        } catch (err) {
          logger.error(`addIntegrationRoute: Caught error:`, err);
          const automaticImportV2Response = buildAutomaticImportV2Response(response);
          return automaticImportV2Response.error({
            statusCode: 500,
            body: err,
          });
        }
      }
    );

function createIntegrationId(title: string): string {
  return title.toLowerCase().replace(/ /g, '-');
}
