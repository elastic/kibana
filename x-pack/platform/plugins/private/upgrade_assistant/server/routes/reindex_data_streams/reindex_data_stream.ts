/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { errors } from '@elastic/elasticsearch';
import { i18n } from '@kbn/i18n';

import { error } from '../../lib/data_streams/error';
import { API_BASE_PATH } from '../../../common/constants';
import { DataStreamReindexStatusResponse } from '../../../common/types';
import { versionCheckHandlerWrapper } from '../../lib/es_version_precheck';
import { dataStreamReindexServiceFactory } from '../../lib/data_streams';

import { RouteDependencies } from '../../types';
import { mapAnyErrorToKibanaHttpResponse } from './map_any_error_to_kibana_http_response';

export function registerReindexDataStreamRoutes({
  router,
  licensing,
  log,
  getSecurityPlugin,
  lib: { handleEsError },
}: RouteDependencies) {
  const BASE_PATH = `${API_BASE_PATH}/reindex_data_streams`;

  router.post(
    {
      path: `${BASE_PATH}/{dataStreamName}`,
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on elasticsearch for authorization',
        },
      },
      options: {
        access: 'public',
        summary: `Start the data stream reindexing`,
      },
      validate: {
        params: schema.object({
          dataStreamName: schema.string(),
        }),
      },
    },
    versionCheckHandlerWrapper(async ({ core }, request, response) => {
      const {
        elasticsearch: { client: esClient },
      } = await core;
      const { dataStreamName } = request.params;
      try {
        const callAsCurrentUser = esClient.asCurrentUser;
        const reindexService = dataStreamReindexServiceFactory({
          esClient: callAsCurrentUser,
          log,
          licensing,
        });

        if (!(await reindexService.hasRequiredPrivileges(dataStreamName))) {
          throw error.accessForbidden(
            i18n.translate(
              'xpack.upgradeAssistant.datastream.reindex.reindexPrivilegesErrorBatch',
              {
                defaultMessage: `You do not have adequate privileges to reindex "{dataStreamName}".`,
                values: { dataStreamName },
              }
            )
          );
        }

        await reindexService.createReindexOperation(dataStreamName);

        return response.ok();
      } catch (err) {
        if (err instanceof errors.ResponseError) {
          return handleEsError({ error: err, response });
        }
        return mapAnyErrorToKibanaHttpResponse(err);
      }
    })
  );

  router.get(
    {
      path: `${BASE_PATH}/{dataStreamName}`,
      options: {
        access: 'public',
        summary: `Get data stream status`,
      },
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      validate: {
        params: schema.object({
          dataStreamName: schema.string(),
        }),
      },
    },
    versionCheckHandlerWrapper(async ({ core }, request, response) => {
      const {
        elasticsearch: { client: esClient },
      } = await core;
      const { dataStreamName } = request.params;
      const asCurrentUser = esClient.asCurrentUser;

      const reindexService = dataStreamReindexServiceFactory({
        esClient: asCurrentUser,
        log,
        licensing,
      });

      try {
        const hasRequiredPrivileges = await reindexService.hasRequiredPrivileges(dataStreamName);

        // If the user doesn't have privileges than querying for warnings is going to fail.
        const warnings = hasRequiredPrivileges
          ? await reindexService.detectReindexWarnings(dataStreamName)
          : [];

        const reindexOp = await reindexService.fetchReindexStatus(dataStreamName);

        const body: DataStreamReindexStatusResponse = {
          reindexOp,
          warnings,
          hasRequiredPrivileges,
        };

        return response.ok({
          body,
        });
      } catch (err) {
        if (err instanceof errors.ResponseError) {
          return handleEsError({ error: err, response });
        }
        return mapAnyErrorToKibanaHttpResponse(error);
      }
    })
  );

  router.get(
    {
      path: `${BASE_PATH}/{dataStreamName}/metadata`,
      options: {
        access: 'public',
        summary: `Get data stream reindexing metadata`,
      },
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      validate: {
        params: schema.object({
          dataStreamName: schema.string(),
        }),
      },
    },
    versionCheckHandlerWrapper(async ({ core }, request, response) => {
      const {
        elasticsearch: { client: esClient },
      } = await core;
      const { dataStreamName } = request.params;
      const asCurrentUser = esClient.asCurrentUser;

      const reindexService = dataStreamReindexServiceFactory({
        esClient: asCurrentUser,
        log,
        licensing,
      });

      try {
        const dataStreamMetadata = await reindexService.getDataStreamMetadata(dataStreamName);

        return response.ok({
          body: dataStreamMetadata || undefined,
        });
      } catch (err) {
        if (err instanceof errors.ResponseError) {
          return handleEsError({ error: err, response });
        }
        return mapAnyErrorToKibanaHttpResponse(error);
      }
    })
  );

  router.post(
    {
      path: `${BASE_PATH}/{dataStreamName}/cancel`,
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on elasticsearch for authorization',
        },
      },
      options: {
        access: 'public',
        summary: `Cancel Data Stream reindexing`,
      },
      validate: {
        params: schema.object({
          dataStreamName: schema.string(),
        }),
      },
    },
    versionCheckHandlerWrapper(async ({ core }, request, response) => {
      const {
        elasticsearch: { client: esClient },
      } = await core;
      const { dataStreamName } = request.params;
      const callAsCurrentUser = esClient.asCurrentUser;

      const reindexService = dataStreamReindexServiceFactory({
        esClient: callAsCurrentUser,
        log,
        licensing,
      });

      try {
        if (!(await reindexService.hasRequiredPrivileges(dataStreamName))) {
          throw error.accessForbidden(
            i18n.translate(
              'xpack.upgradeAssistant.datastream.reindex.reindexPrivilegesErrorBatch',
              {
                defaultMessage: `You do not have adequate privileges to cancel reindexing "{dataStreamName}".`,
                values: { dataStreamName },
              }
            )
          );
        }

        await reindexService.cancelReindexing(dataStreamName);

        return response.ok({ body: { acknowledged: true } });
      } catch (err) {
        if (err instanceof errors.ResponseError) {
          return handleEsError({ error: err, response });
        }

        return mapAnyErrorToKibanaHttpResponse(error);
      }
    })
  );
}
