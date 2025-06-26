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
import { dataStreamMigrationServiceFactory } from '../../lib/data_streams';

import { RouteDependencies } from '../../types';
import { mapAnyErrorToKibanaHttpResponse } from './map_any_error_to_kibana_http_response';

export function registerMigrateDataStreamRoutes({
  router,
  licensing,
  log,
  lib: { handleEsError },
}: RouteDependencies) {
  const BASE_PATH = `${API_BASE_PATH}/migrate_data_stream`;

  router.get(
    {
      path: `${BASE_PATH}/{dataStreamName}`,
      options: {
        access: 'public',
        summary: `Get data stream status`,
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

      const migrationService = dataStreamMigrationServiceFactory({
        esClient: asCurrentUser,
        log,
        licensing,
      });

      try {
        const hasRequiredPrivileges = await migrationService.hasRequiredPrivileges(dataStreamName);
        const warnings = await migrationService.detectMigrationWarnings(dataStreamName);
        const migrationOp = await migrationService.fetchMigrationStatus(dataStreamName);

        const body: DataStreamReindexStatusResponse = {
          migrationOp,
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

  router.post(
    {
      path: `${BASE_PATH}/{dataStreamName}/reindex`,
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
        const migrationService = dataStreamMigrationServiceFactory({
          esClient: callAsCurrentUser,
          log,
          licensing,
        });

        if (!(await migrationService.hasRequiredPrivileges(dataStreamName))) {
          throw error.accessForbidden(
            i18n.translate('xpack.upgradeAssistant.datastream.reindexPrivilegesErrorBatch', {
              defaultMessage: `You do not have adequate privileges to reindex "{dataStreamName}".`,
              values: { dataStreamName },
            })
          );
        }

        await migrationService.createReindexOperation(dataStreamName);

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
      path: `${BASE_PATH}/{dataStreamName}/metadata`,
      options: {
        access: 'public',
        summary: `Get data stream metadata`,
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

      const migrationService = dataStreamMigrationServiceFactory({
        esClient: asCurrentUser,
        log,
        licensing,
      });

      try {
        const dataStreamMetadata = await migrationService.getDataStreamMetadata(dataStreamName);

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
      path: `${BASE_PATH}/{dataStreamName}/reindex/cancel`,
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

      const migrationService = dataStreamMigrationServiceFactory({
        esClient: callAsCurrentUser,
        log,
        licensing,
      });

      try {
        if (!(await migrationService.hasRequiredPrivileges(dataStreamName))) {
          throw error.accessForbidden(
            i18n.translate('xpack.upgradeAssistant.datastream.reindexPrivilegesErrorBatch', {
              defaultMessage: `You do not have adequate privileges to cancel reindexing "{dataStreamName}".`,
              values: { dataStreamName },
            })
          );
        }

        await migrationService.cancelReindexing(dataStreamName);

        return response.ok({ body: { acknowledged: true } });
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
      path: `${BASE_PATH}/{dataStreamName}/readonly`,
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on elasticsearch for authorization',
        },
      },
      options: {
        access: 'public',
        summary: `Set data stream indices as read-only`,
      },
      validate: {
        body: schema.object({
          indices: schema.arrayOf(schema.string()),
        }),
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
      const { indices } = request.body;
      const callAsCurrentUser = esClient.asCurrentUser;

      const migrationService = dataStreamMigrationServiceFactory({
        esClient: callAsCurrentUser,
        log,
        licensing,
      });

      try {
        if (!(await migrationService.hasRequiredPrivileges(dataStreamName))) {
          throw error.accessForbidden(
            i18n.translate('xpack.upgradeAssistant.datastream.readonlyPrivilegesErrorBatch', {
              defaultMessage: `You do not have adequate privileges to mark indices inside data stream as readonly "{dataStreamName}".`,
              values: { dataStreamName },
            })
          );
        }

        await migrationService.readonlyIndices(dataStreamName, indices);
        return response.ok({ body: { acknowledged: true } });
      } catch (err) {
        if (err instanceof errors.ResponseError) {
          return handleEsError({ error: err, response });
        }
        return mapAnyErrorToKibanaHttpResponse(err);
      }
    })
  );
  router.delete(
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
        summary: `Delete data stream`,
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

      try {
        await callAsCurrentUser.indices.deleteDataStream({
          name: dataStreamName,
        });

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
