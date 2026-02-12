/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SavedObjectsClient } from '@kbn/core/server';
import type { ElasticsearchErrorDetails } from '@kbn/es-errors';

import { i18n } from '@kbn/i18n';
import type { ConnectorStatus, FilteringRule, Connector } from '@kbn/search-connectors';
import {
  CONNECTORS_INDEX,
  cancelSync,
  deleteConnectorById,
  deleteConnectorSecret,
  fetchConnectorById,
  fetchConnectors,
  fetchSyncJobs,
  putUpdateNative,
  updateConnectorConfiguration,
  updateConnectorNameAndDescription,
  updateConnectorScheduling,
  updateConnectorServiceType,
  updateConnectorStatus,
  updateFiltering,
  updateFilteringDraft,
  SyncJobType,
  cancelSyncs,
  isResourceNotFoundException,
  isStatusTransitionException,
  fetchConnectorByIndexName,
} from '@kbn/search-connectors';

import { addConnector } from '../lib/connectors/add_connector';
import { generateConfig } from '../lib/connectors/generate_config';
import { generateConnectorName } from '../lib/connectors/generate_connector_name';
import { startSync } from '../lib/connectors/start_sync';
import { deleteAccessControlIndex } from '../lib/indices/delete_access_control_index';
import { fetchIndexCounts } from '../lib/indices/fetch_index_counts';
import { fetchUnattachedIndices } from '../lib/indices/fetch_unattached_indices';
import { generateApiKey } from '../lib/indices/generate_api_key';
import { deleteIndexPipelines } from '../lib/pipelines/delete_pipelines';
import { getDefaultPipeline } from '../lib/pipelines/get_default_pipeline';
import { updateDefaultPipeline } from '../lib/pipelines/update_default_pipeline';
import { updateConnectorPipeline } from '../lib/pipelines/update_pipeline';

import type { SearchConnectorsPluginSetupDependencies } from '../types';
import { createError } from '../utils/create_error';
import { elasticsearchErrorHandler } from '../utils/elasticsearch_error_handler';
import {
  isAccessControlDisabledException,
  isExpensiveQueriesNotAllowedException,
  isIndexNotFoundException,
} from '../utils/identify_exceptions';
import { ErrorCode } from '../../common/types/error_codes';
import { AgentlessConnectorsInfraService } from '../services';
import { fetchIndex } from '../lib/indices/fetch_index';
import { createIndex } from '../lib/indices/create_index';

export function registerConnectorRoutes({
  router,
  log,
  getStartServices,
}: SearchConnectorsPluginSetupDependencies) {
  router.post(
    {
      path: '/internal/content_connectors/connectors',
      validate: {
        body: schema.object({
          delete_existing_connector: schema.maybe(schema.boolean()),
          index_name: schema.maybe(schema.string()),
          is_native: schema.boolean(),
          language: schema.nullable(schema.string()),
          name: schema.maybe(schema.string()),
          service_type: schema.maybe(schema.string()),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const [_core, start] = await getStartServices();
      const isAgentlessEnabled = start.fleet?.agentless?.enabled === true;
      try {
        let indexName = request.body.index_name;
        if (!indexName) {
          const generatedNames = await generateConnectorName(
            client,
            request.body.service_type ?? 'custom',
            request.body.name,
            request.body.is_native ?? false
          );
          indexName = generatedNames.indexName;
        }
        const body = await addConnector(
          client,
          {
            deleteExistingConnector: request.body.delete_existing_connector,
            indexName,
            isNative: request.body.is_native,
            language: request.body.language,
            name: request.body.name ?? null,
            serviceType: request.body.service_type,
          },
          isAgentlessEnabled
        );
        return response.ok({ body });
      } catch (error) {
        if (
          (error as Error).message === ErrorCode.CONNECTOR_DOCUMENT_ALREADY_EXISTS ||
          (error as Error).message === ErrorCode.INDEX_ALREADY_EXISTS
        ) {
          return createError({
            errorCode: (error as Error).message as ErrorCode,
            message: i18n.translate(
              'xpack.contentConnectors.routes.addConnector.connectorExistsError',
              {
                defaultMessage: 'Connector or index already exists',
              }
            ),
            response,
            statusCode: 409,
          });
        }

        throw error;
      }
    })
  );

  router.post(
    {
      path: '/internal/content_connectors/connectors/{connectorId}/cancel_syncs',
      validate: {
        params: schema.object({
          connectorId: schema.string(),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      await cancelSyncs(client.asCurrentUser, request.params.connectorId);
      return response.ok();
    })
  );

  router.put(
    {
      path: '/internal/content_connectors/connectors/{syncJobId}/cancel_sync',
      validate: {
        params: schema.object({
          syncJobId: schema.string(),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      try {
        await cancelSync(client.asCurrentUser, request.params.syncJobId);
      } catch (error) {
        if (isStatusTransitionException(error)) {
          return createError({
            errorCode: ErrorCode.STATUS_TRANSITION_ERROR,
            message: i18n.translate(
              'xpack.contentConnectors.routes.connectors.statusTransitionError',
              {
                defaultMessage:
                  'Connector sync job cannot be cancelled. Connector is already cancelled or not in a cancelable state.',
              }
            ),
            response,
            statusCode: 400,
          });
        }
        throw error;
      }
      return response.ok();
    })
  );

  router.post(
    {
      path: '/internal/content_connectors/connectors/{connectorId}/configuration',
      validate: {
        body: schema.recordOf(
          schema.string(),
          schema.oneOf([schema.string(), schema.number(), schema.boolean()])
        ),
        params: schema.object({
          connectorId: schema.string(),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const configuration = await updateConnectorConfiguration(
        client.asCurrentUser,
        request.params.connectorId,
        request.body
      );
      return response.ok({ body: configuration });
    })
  );

  router.post(
    {
      path: '/internal/content_connectors/connectors/{connectorId}/scheduling',
      validate: {
        body: schema.object({
          access_control: schema.object({ enabled: schema.boolean(), interval: schema.string() }),
          full: schema.object({ enabled: schema.boolean(), interval: schema.string() }),
          incremental: schema.object({ enabled: schema.boolean(), interval: schema.string() }),
        }),
        params: schema.object({
          connectorId: schema.string(),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      await updateConnectorScheduling(
        client.asCurrentUser,
        request.params.connectorId,
        request.body
      );
      return response.ok();
    })
  );

  router.post(
    {
      path: '/internal/content_connectors/connectors/{connectorId}/start_sync',
      validate: {
        params: schema.object({
          connectorId: schema.string(),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      await startSync(client, request.params.connectorId, SyncJobType.FULL);
      return response.ok();
    })
  );

  router.post(
    {
      path: '/internal/content_connectors/connectors/{connectorId}/start_incremental_sync',
      validate: {
        params: schema.object({
          connectorId: schema.string(),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      await startSync(client, request.params.connectorId, SyncJobType.INCREMENTAL);
      return response.ok();
    })
  );

  router.post(
    {
      path: '/internal/content_connectors/connectors/{connectorId}/start_access_control_sync',
      validate: {
        params: schema.object({
          connectorId: schema.string(),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      try {
        const { client } = (await context.core).elasticsearch;
        await startSync(client, request.params.connectorId, SyncJobType.ACCESS_CONTROL);
        return response.ok();
      } catch (error) {
        if (isAccessControlDisabledException(error)) {
          return createError({
            errorCode: ErrorCode.ACCESS_CONTROL_DISABLED,
            message: i18n.translate(
              'xpack.contentConnectors.connectors.accessControlSync.accessControlDisabledError',
              {
                defaultMessage:
                  'Access control sync cannot be created. You must first enable Document Level Security.',
              }
            ),
            response,
            statusCode: 400,
          });
        }
        throw error;
      }
    })
  );

  router.get(
    {
      path: '/internal/content_connectors/connectors/{connectorId}/sync_jobs',
      validate: {
        params: schema.object({
          connectorId: schema.string(),
        }),
        query: schema.object({
          from: schema.number({ defaultValue: 0, min: 0 }),
          size: schema.number({ defaultValue: 10, min: 0 }),
          type: schema.maybe(schema.string()),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const result = await fetchSyncJobs(
        client.asCurrentUser,
        request.params.connectorId,
        request.query.from,
        request.query.size,
        request.query.type as 'content' | 'access_control' | 'all'
      );
      return response.ok({ body: result });
    })
  );

  router.put(
    {
      path: '/internal/content_connectors/connectors/{connectorId}/pipeline',
      validate: {
        body: schema.object({
          extract_binary_content: schema.boolean(),
          name: schema.string(),
          reduce_whitespace: schema.boolean(),
          run_ml_inference: schema.boolean(),
        }),
        params: schema.object({
          connectorId: schema.string(),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;

      await updateConnectorPipeline(client, request.params.connectorId, request.body);
      return response.ok();
    })
  );

  router.put(
    {
      path: '/internal/content_connectors/connectors/default_pipeline',
      validate: {
        body: schema.object({
          extract_binary_content: schema.boolean(),
          name: schema.string(),
          reduce_whitespace: schema.boolean(),
          run_ml_inference: schema.boolean(),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      await updateDefaultPipeline(client, request.body);
      return response.ok();
    })
  );

  router.get(
    {
      path: '/internal/content_connectors/connectors/default_pipeline',
      validate: {},
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
    },
    elasticsearchErrorHandler(log, async (context, _, response) => {
      const { client } = (await context.core).elasticsearch;
      const result = await getDefaultPipeline(client);
      return response.ok({ body: result });
    })
  );

  router.put(
    {
      path: '/internal/content_connectors/connectors/{connectorId}/service_type',
      validate: {
        body: schema.object({ serviceType: schema.string() }),
        params: schema.object({
          connectorId: schema.string(),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const result = await updateConnectorServiceType(
        client.asCurrentUser,
        request.params.connectorId,
        request.body.serviceType
      );
      return response.ok({ body: result });
    })
  );

  router.put(
    {
      path: '/internal/content_connectors/connectors/{connectorId}/status',
      validate: {
        body: schema.object({ status: schema.string() }),
        params: schema.object({
          connectorId: schema.string(),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const result = await updateConnectorStatus(
        client.asCurrentUser,
        request.params.connectorId,
        request.body.status as ConnectorStatus
      );
      return response.ok({ body: result });
    })
  );

  router.put(
    {
      path: '/internal/content_connectors/connectors/{connectorId}/name_and_description',
      validate: {
        body: schema.object({
          description: schema.nullable(schema.string()),
          name: schema.string(),
        }),
        params: schema.object({
          connectorId: schema.string(),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const { name, description } = request.body;
      const result = await updateConnectorNameAndDescription(
        client.asCurrentUser,
        request.params.connectorId,
        {
          description,
          name,
        }
      );
      return response.ok({ body: result });
    })
  );

  router.put(
    {
      path: '/internal/content_connectors/connectors/{connectorId}/filtering/draft',
      validate: {
        body: schema.object({
          advanced_snippet: schema.string(),
          filtering_rules: schema.arrayOf(
            schema.object({
              created_at: schema.string(),
              field: schema.string(),
              id: schema.string(),
              order: schema.number(),
              policy: schema.string(),
              rule: schema.string(),
              updated_at: schema.string(),
              value: schema.string(),
            })
          ),
        }),
        params: schema.object({
          connectorId: schema.string(),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const { connectorId } = request.params;
      const { advanced_snippet, filtering_rules } = request.body;
      const result = await updateFilteringDraft(client.asCurrentUser, connectorId, {
        advancedSnippet: advanced_snippet,
        // Have to cast here because our API schema validator doesn't know how to deal with enums
        // We're relying on the schema in the validator above to flag if something goes wrong
        filteringRules: filtering_rules as FilteringRule[],
      });
      return result ? response.ok({ body: result }) : response.conflict();
    })
  );

  router.put(
    {
      path: '/internal/content_connectors/connectors/{connectorId}/filtering',
      validate: {
        body: schema.maybe(
          schema.object({
            advanced_snippet: schema.string(),
            filtering_rules: schema.arrayOf(
              schema.object({
                created_at: schema.string(),
                field: schema.string(),
                id: schema.string(),
                order: schema.number(),
                policy: schema.string(),
                rule: schema.string(),
                updated_at: schema.string(),
                value: schema.string(),
              })
            ),
          })
        ),
        params: schema.object({
          connectorId: schema.string(),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const { connectorId } = request.params;
      const result = await updateFiltering(client.asCurrentUser, connectorId);
      return result ? response.ok({ body: result }) : response.conflict();
    })
  );
  router.put(
    {
      path: '/internal/content_connectors/connectors/{connectorId}/native',
      validate: {
        body: schema.object({
          is_native: schema.boolean(),
        }),
        params: schema.object({
          connectorId: schema.string(),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const connectorId = decodeURIComponent(request.params.connectorId);
      const { is_native } = request.body;
      const result = await putUpdateNative(client.asCurrentUser, connectorId, is_native);
      return result ? response.ok({ body: result }) : response.conflict();
    })
  );
  router.get(
    {
      path: '/internal/content_connectors/connectors',
      validate: {
        query: schema.object({
          fetchCrawlersOnly: schema.maybe(schema.boolean()),
          from: schema.number({ defaultValue: 0, min: 0 }),
          searchQuery: schema.string({ defaultValue: '' }),
          size: schema.number({ defaultValue: 10, min: 0 }),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const { fetchCrawlersOnly, from, size, searchQuery } = request.query;

      let connectorResult;
      let connectorCountResult;
      let connectorResultSlice;
      const indicesExist: Record<string, boolean> = {};
      try {
        connectorResult = await fetchConnectors(
          client.asCurrentUser,
          undefined,
          fetchCrawlersOnly,
          searchQuery,
          false
        );

        connectorResultSlice = connectorResult.slice(from, from + size);
        for (const connector of connectorResultSlice) {
          if (connector.index_name) {
            const indexExists = await client.asCurrentUser.indices.exists({
              index: connector.index_name,
            });
            indicesExist[connector.index_name] = indexExists;
          }
        }
        const indicesSlice = connectorResultSlice.reduce((acc: string[], connector) => {
          if (connector.index_name) {
            acc.push(connector.index_name);
          }
          return acc;
        }, []);
        connectorCountResult = await fetchIndexCounts(client, indicesSlice);
      } catch (error) {
        if (isExpensiveQueriesNotAllowedException(error)) {
          return createError({
            errorCode: ErrorCode.EXPENSIVE_QUERY_NOT_ALLOWED_ERROR,
            message: i18n.translate(
              'xpack.contentConnectors.routes.connectors.expensive_query_not_allowed_error',
              {
                defaultMessage:
                  'Expensive search queries not allowed. "search.allow_expensive_queries" is set to false ',
              }
            ),
            response,
            statusCode: 400,
          });
        }
        throw error;
      }
      return response.ok({
        body: {
          connectors: connectorResultSlice,
          counts: connectorCountResult,
          indexExists: indicesExist,
          meta: {
            page: {
              from,
              size,
              total: connectorResult.length,
            },
          },
        },
      });
    })
  );
  router.get(
    {
      path: '/internal/content_connectors/connectors/{connectorId}',
      validate: {
        params: schema.object({
          connectorId: schema.string(),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const { connectorId } = request.params;
      const connectorResult = await fetchConnectorById(client.asCurrentUser, connectorId);

      return response.ok({
        body: {
          connector: connectorResult,
        },
      });
    })
  );
  router.delete(
    {
      path: '/internal/content_connectors/connectors/{connectorId}',
      validate: {
        params: schema.object({
          connectorId: schema.string(),
        }),
        query: schema.object({
          shouldDeleteIndex: schema.maybe(schema.boolean()),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const { connectorId } = request.params;
      const { shouldDeleteIndex } = request.query;

      const [_core, start] = await getStartServices();
      const isAgentlessEnabled = start.fleet?.agentless?.enabled === true;

      let connectorResponse;
      try {
        const connector = await fetchConnectorById(client.asCurrentUser, connectorId);
        const indexNameToDelete = shouldDeleteIndex ? connector?.index_name : null;
        const apiKeyId = connector?.api_key_id;
        const secretId = connector?.api_key_secret_id;

        connectorResponse = await deleteConnectorById(client.asCurrentUser, connectorId);

        if (indexNameToDelete) {
          await deleteIndexPipelines(client, indexNameToDelete);
          await deleteAccessControlIndex(client, indexNameToDelete);
          const indexExists = await client.asCurrentUser.indices.exists({
            index: indexNameToDelete,
          });
          if (indexExists) {
            await client.asCurrentUser.indices.delete({ index: indexNameToDelete });
          }
        }
        if (apiKeyId) {
          await client.asCurrentUser.security.invalidateApiKey({ ids: [apiKeyId] });
        }
        if (!isAgentlessEnabled && secretId) {
          await deleteConnectorSecret(client.asCurrentUser, secretId);
        }
      } catch (error) {
        if (isResourceNotFoundException(error)) {
          return createError({
            errorCode: ErrorCode.RESOURCE_NOT_FOUND,
            message: i18n.translate(
              'xpack.contentConnectors.routes.connectors.resource_not_found_error',
              {
                defaultMessage: 'Connector with id {connectorId} is not found.',
                values: { connectorId },
              }
            ),
            response,
            statusCode: 404,
          });
        }

        if (isIndexNotFoundException(error)) {
          return createError({
            errorCode: ErrorCode.INDEX_NOT_FOUND,
            message: 'Could not find index',
            response,
            statusCode: 404,
          });
        }

        throw error;
      }

      return response.ok({ body: connectorResponse });
    })
  );
  router.put(
    {
      path: '/internal/content_connectors/connectors/{connectorId}/index_name/{indexName}',
      validate: {
        params: schema.object({
          connectorId: schema.string(),
          indexName: schema.string(),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const { connectorId, indexName } = request.params;
      try {
        await client.asCurrentUser.transport.request({
          body: {
            index_name: indexName,
          },
          method: 'PUT',
          path: `/_connector/${connectorId}/_index_name`,
        });
      } catch (error) {
        // This will almost always be a conflict because another connector has the index configured
        // ES returns this reason nicely so we can just pass it through
        return response.customError({
          body: (error.meta.body as ElasticsearchErrorDetails)?.error?.reason,
          statusCode: 500,
        });
      }

      const connector = await fetchConnectorById(client.asCurrentUser, connectorId);
      if (connector?.is_native) {
        const [_core, start] = await getStartServices();
        const isAgentlessEnabled = start.fleet?.agentless?.enabled === true;
        // generateApiKey will search for the connector doc based on index_name, so we need to refresh the index before that.
        await client.asCurrentUser.indices.refresh({ index: CONNECTORS_INDEX });
        await generateApiKey(client, indexName, true, isAgentlessEnabled);
      }

      return response.ok();
    })
  );

  router.get(
    {
      path: '/internal/content_connectors/connectors/available_indices',
      validate: {
        query: schema.object({
          from: schema.number({ defaultValue: 0, min: 0 }),
          search_query: schema.maybe(schema.string()),
          size: schema.number({ defaultValue: 40, min: 0 }),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { from, size, search_query: searchQuery } = request.query;
      const { client } = (await context.core).elasticsearch;

      const { indexNames, totalResults } = await fetchUnattachedIndices(
        client,
        searchQuery,
        from,
        size
      );

      return response.ok({
        body: {
          indexNames,
          meta: {
            page: {
              from,
              size,
              total: totalResults,
            },
          },
        },
        headers: { 'content-type': 'application/json' },
      });
    })
  );

  router.post(
    {
      path: '/internal/content_connectors/connectors/{connectorId}/generate_config',
      validate: {
        params: schema.object({
          connectorId: schema.string(),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const { connectorId } = request.params;

      let associatedIndex;
      let apiKeyResponse;
      try {
        const connector = await fetchConnectorById(client.asCurrentUser, connectorId);

        if (!connector) {
          return createError({
            errorCode: ErrorCode.RESOURCE_NOT_FOUND,
            message: i18n.translate(
              'xpack.contentConnectors.routes.connectors.resource_not_found_error',
              {
                defaultMessage: 'Connector with id {connectorId} is not found.',
                values: { connectorId },
              }
            ),
            response,
            statusCode: 404,
          });
        }

        const [_core, start] = await getStartServices();
        const isAgentlessEnabled = start.fleet?.agentless?.enabled === true;
        const configResponse = await generateConfig(client, connector, isAgentlessEnabled);
        associatedIndex = configResponse.associatedIndex;
        apiKeyResponse = configResponse.apiKeyResponse;
      } catch (error) {
        if (error.message === ErrorCode.GENERATE_INDEX_NAME_ERROR) {
          createError({
            errorCode: ErrorCode.GENERATE_INDEX_NAME_ERROR,
            message: i18n.translate(
              'xpack.contentConnectors.routes.connectors.generateConfiguration.indexAlreadyExistsError',
              {
                defaultMessage: 'Cannot find a unique index name to generate configuration',
              }
            ),
            response,
            statusCode: 409,
          });
          throw error;
        }
      }

      return response.ok({
        body: {
          apiKey: apiKeyResponse,
          connectorId,
          indexName: associatedIndex,
        },
        headers: { 'content-type': 'application/json' },
      });
    })
  );
  router.post(
    {
      path: '/internal/content_connectors/connectors/generate_connector_name',
      validate: {
        body: schema.object({
          connectorName: schema.maybe(schema.string()),
          connectorType: schema.string(),
          isManagedConnector: schema.maybe(schema.boolean()),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const { connectorType, connectorName, isManagedConnector } = request.body;
      try {
        const generatedNames = await generateConnectorName(
          client,
          connectorType ?? 'custom',
          connectorName,
          isManagedConnector
        );
        return response.ok({
          body: generatedNames,
          headers: { 'content-type': 'application/json' },
        });
      } catch (error) {
        if (error.message === ErrorCode.GENERATE_INDEX_NAME_ERROR) {
          return createError({
            errorCode: ErrorCode.GENERATE_INDEX_NAME_ERROR,
            message: i18n.translate(
              'xpack.contentConnectors.routes.connectors.generateConfiguration.indexAlreadyExistsError',
              {
                defaultMessage: 'Cannot find a unique connector name',
              }
            ),
            response,
            statusCode: 409,
          });
        } else {
          throw error;
        }
      }
    })
  );

  router.get(
    {
      path: '/internal/content_connectors/{connectorId}/agentless_policy',
      validate: {
        params: schema.object({
          connectorId: schema.string(),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { connectorId } = request.params;
      const { client } = (await context.core).elasticsearch;

      try {
        const connector = await fetchConnectorById(client.asCurrentUser, connectorId);

        if (!connector) {
          return createError({
            errorCode: ErrorCode.RESOURCE_NOT_FOUND,
            message: i18n.translate(
              'xpack.contentConnectors.routes.connectors.resource_not_found_error',
              {
                defaultMessage: 'Connector with id {connectorId} is not found.',
                values: { connectorId },
              }
            ),
            response,
            statusCode: 404,
          });
        }

        if (!connector?.is_native) {
          return createError({
            errorCode: ErrorCode.CONNECTOR_UNSUPPORTED_OPERATION,
            message: i18n.translate(
              'xpack.contentConnectors.routes.connectors.generateConfiguration.indexAlreadyExistsError',
              {
                defaultMessage:
                  'Failed to fetch agentless deployment details: This action is only supported for Elastic-managed connectors.',
              }
            ),
            response,
            statusCode: 400,
          });
        }

        const [_core, start] = await getStartServices();

        const savedObjects = _core.savedObjects;

        const agentlessPolicyService = start.fleet!.agentlessPoliciesService;
        const packagePolicyService = start.fleet!.packagePolicyService;
        const agentService = start.fleet!.agentService;

        const soClient = new SavedObjectsClient(savedObjects.createInternalRepository());

        const service = new AgentlessConnectorsInfraService(
          soClient,
          client.asCurrentUser,
          packagePolicyService,
          agentlessPolicyService,
          agentService,
          log
        );

        const policy = await service.getAgentPolicyForConnectorId({ connectorId });

        if (!policy) {
          return response.ok({
            body: {
              policy: null,
              agent: null,
            },
            headers: { 'content-type': 'application/json' },
          });
        }

        return response.ok({
          body: {
            policy: {
              id: policy.agent_policy_ids[0],
              name: policy.package_policy_name,
            },
            agent: policy.agent_metadata,
          },
          headers: { 'content-type': 'application/json' },
        });
      } catch (error) {
        return createError({
          errorCode: ErrorCode.CONNECTOR_UNSUPPORTED_OPERATION,
          message: i18n.translate(
            'xpack.contentConnectors.routes.connectors.agentlessPolicyError',
            {
              defaultMessage: 'Failed to fetch agentless deployment details',
            }
          ),
          response,
          statusCode: 500,
        });
      }
    })
  );

  router.get(
    {
      path: '/internal/content_connectors/indices/{indexName}',
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const indexName = decodeURIComponent(request.params.indexName);
      const { client } = (await context.core).elasticsearch;

      try {
        const index = await fetchIndex(client.asCurrentUser, indexName);
        return response.ok({
          body: index?.index,
          headers: { 'content-type': 'application/json' },
        });
      } catch (error) {
        if (isIndexNotFoundException(error)) {
          return createError({
            errorCode: ErrorCode.INDEX_NOT_FOUND,
            message: 'Could not find index',
            response,
            statusCode: 404,
          });
        }

        throw error;
      }
    })
  );

  router.get(
    {
      path: '/internal/content_connectors/indices/{indexName}/exists',
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const indexName = decodeURIComponent(request.params.indexName);
      const { client } = (await context.core).elasticsearch;
      let indexExists: boolean;

      try {
        indexExists = await client.asCurrentUser.indices.exists({ index: indexName });
      } catch (e) {
        log.warn(
          i18n.translate('xpack.enterpriseSearch.server.routes.indices.existsErrorLogMessage', {
            defaultMessage: 'An error occurred while resolving request to {requestUrl}',
            values: {
              requestUrl: request.url.toString(),
            },
          })
        );
        log.warn(e);
        indexExists = false;
      }

      return response.ok({
        body: {
          exists: indexExists,
        },
        headers: { 'content-type': 'application/json' },
      });
    })
  );

  router.post(
    {
      path: '/internal/content_connectors/indices',
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
      validate: {
        body: schema.object({
          index_name: schema.string(),
          language: schema.maybe(schema.nullable(schema.string())),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { ['index_name']: indexName, language } = request.body;
      const { client } = (await context.core).elasticsearch;

      const indexExists = await client.asCurrentUser.indices.exists({
        index: request.body.index_name,
      });

      if (indexExists) {
        return createError({
          errorCode: ErrorCode.INDEX_ALREADY_EXISTS,
          message: i18n.translate(
            'xpack.enterpriseSearch.server.routes.createApiIndex.indexExistsError',
            {
              defaultMessage: 'This index already exists',
            }
          ),
          response,
          statusCode: 409,
        });
      }
      let connector: Connector | undefined;
      // users without permissions to fetch connectors should still be able to create an index
      try {
        connector = await fetchConnectorByIndexName(client.asCurrentUser, indexName);
      } catch (error) {
        log.error(`Error fetching connector for index ${indexName}: ${error}`);
      }

      if (connector) {
        return createError({
          errorCode: ErrorCode.CONNECTOR_DOCUMENT_ALREADY_EXISTS,
          message: i18n.translate(
            'xpack.enterpriseSearch.server.routes.createApiIndex.connectorExistsError',
            {
              defaultMessage: 'A connector for this index already exists',
            }
          ),
          response,
          statusCode: 409,
        });
      }

      const createIndexResponse = await createIndex(client, indexName, language, true);

      return response.ok({
        body: createIndexResponse,
        headers: { 'content-type': 'application/json' },
      });
    })
  );
}
