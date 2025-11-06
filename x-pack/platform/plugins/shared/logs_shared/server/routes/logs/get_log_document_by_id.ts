/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { getLogDocumentByIdRequestParamsRT } from '../../../common/http_api/logs';
import { createValidationFunction } from '../../../common/runtime_types';
import type { LogsSharedBackendLibs } from '../../lib/logs_shared_types';

export const LOG_DOCUMENT_BY_ID_URL = '/internal/logs_shared/logs/{id}';

export const initGetLogDocumentByIdRoute = ({
  framework,
  getStartServices,
}: LogsSharedBackendLibs) => {
  framework
    .registerVersionedRoute({
      access: 'internal',
      method: 'get',
      path: LOG_DOCUMENT_BY_ID_URL,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: createValidationFunction(getLogDocumentByIdRequestParamsRT),
          },
        },
      },
      async (requestContext, request, response) => {
        const { id } = request.params;
        const { savedObjects } = await requestContext.core;
        const logSourcesService = (
          await getStartServices()
        )[1].logsDataAccess.services.logSourcesServiceFactory.getLogSourcesService(
          savedObjects.client
        );

        try {
          // Get log indices directly from advanced settings (log sources)
          const logSourcesServiceInstance = await logSourcesService;
          const logSources = await logSourcesServiceInstance.getLogSources();
          const indexPattern = logSources
            .map((source: { indexPattern: string }) => source.indexPattern)
            .join(',');

          const esQuery = {
            index: indexPattern,
            size: 1,
            body: {
              timeout: '20s',
              fields: [
                {
                  field: '*',
                  include_unmapped: true,
                },
              ],
              query: {
                term: {
                  _id: id,
                },
              },
            },
          };

          const result = await framework.callWithRequest<{ _index?: string; fields?: any }>(
            requestContext,
            'search',
            esQuery
          );

          const hit = result.hits.hits[0];

          return response.ok({
            body: {
              _index: hit?._index ?? null,
              fields: hit?.fields ?? null,
            },
          });
        } catch (error) {
          return response.customError({
            statusCode: error.statusCode ?? 500,
            body: {
              message:
                error.message ??
                i18n.translate('xpack.logsShared.errors.fetchLogDocument', {
                  defaultMessage: 'An error occurred while fetching the log document',
                }),
            },
          });
        }
      }
    );
};
