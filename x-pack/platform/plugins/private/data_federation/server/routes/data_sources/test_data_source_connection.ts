/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';

import { DATA_SOURCE_TEST_ROUTE_PATH } from '../../../common';
import { DataSourcesClient } from '../../data_sources_client';
import { getRouteErrorMessage, getRouteErrorStatusCode } from '../../get_route_error_message';
import type { DataFederationConfigType } from '../../config';

import { testDataSourceBodySchema } from './data_source_schema';

export function registerTestDataSourceConnection(
  router: IRouter,
  config: DataFederationConfigType
): void {
  router.post(
    {
      path: DATA_SOURCE_TEST_ROUTE_PATH,
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
      options: {
        access: 'internal',
      },
      validate: {
        body: testDataSourceBodySchema,
      },
    },
    router.handleLegacyErrors(async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const dataSourcesClient = new DataSourcesClient(client.asCurrentUser);

      try {
        if (request.body.type === 'gcs' && !config.enableGoogleCloudStorageDataSourceType) {
          return response.badRequest({
            body: {
              message: 'Google Cloud Storage data sources are disabled by configuration.',
            },
          });
        }
        if (request.body.type === 'azure' && !config.enableAzureDataSourceType) {
          return response.badRequest({
            body: {
              message: 'Azure data sources are disabled by configuration.',
            },
          });
        }

        const body = await dataSourcesClient.testConnection(request.body);
        return response.ok({ body });
      } catch (error) {
        // Elasticsearch grants `_test` to the cluster `manage` privilege only, so a user who
        // can create data sources through `global.data_source` still gets a 403 here. Keep the
        // original status instead of reporting every failure as an invalid request.
        const statusCode = getRouteErrorStatusCode(error);
        const body = { message: getRouteErrorMessage(error) };

        return statusCode
          ? response.customError({ statusCode, body })
          : response.badRequest({ body });
      }
    })
  );
}
