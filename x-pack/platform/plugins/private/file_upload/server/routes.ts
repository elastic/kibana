/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IScopedClusterClient } from '@kbn/core/server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type {
  IndicesIndexSettings,
  MappingTypeMapping,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { MAX_FILE_SIZE_BYTES, MAX_TIKA_FILE_SIZE_BYTES } from '../common/constants';
import type { IngestPipelineWrapper, InputData } from '../common/types';
import { wrapError } from './error_wrapper';
import { importDataProvider } from './import_data';
import { getTimeFieldRange } from './get_time_field_range';
import { analyzeFile } from './analyze_file';

import { updateTelemetry } from './telemetry';
import {
  importFileBodySchema,
  importFileQuerySchema,
  analyzeFileQuerySchema,
  runtimeMappingsSchema,
} from './schemas';
import type { StartDeps } from './types';
import { checkFileUploadPrivileges } from './check_privileges';
import { previewIndexTimeRange } from './preview_index_time_range';
import { previewTikaContents } from './preview_tika_contents';

function importData(
  client: IScopedClusterClient,
  id: string | undefined,
  index: string,
  settings: IndicesIndexSettings,
  mappings: MappingTypeMapping,
  ingestPipeline: IngestPipelineWrapper,
  createPipelines: IngestPipelineWrapper[],
  data: InputData
) {
  const { importData: importDataFunc } = importDataProvider(client);
  return importDataFunc(id, index, settings, mappings, ingestPipeline, createPipelines, data);
}

/**
 * Routes for the file upload.
 */
export function fileUploadRoutes(coreSetup: CoreSetup<StartDeps, unknown>, logger: Logger) {
  const router = coreSetup.http.createRouter();

  router.versioned
    .get({
      path: '/internal/file_upload/has_import_permission',
      access: 'internal',
    })
    .addVersion(
      {
        version: '1',
        security: {
          authz: {
            enabled: false,
            reason:
              'This route is opted out from authorization because permissions will be checked by elasticsearch',
          },
        },
        validate: {
          request: {
            query: schema.object({
              indexName: schema.maybe(schema.string()),
              checkCreateDataView: schema.boolean(),
              checkHasManagePipeline: schema.boolean(),
            }),
          },
        },
      },
      async (context, request, response) => {
        try {
          const [, pluginsStart] = await coreSetup.getStartServices();
          const { indexName, checkCreateDataView, checkHasManagePipeline } = request.query;

          const { hasImportPermission } = await checkFileUploadPrivileges({
            authorization: pluginsStart.security?.authz,
            request,
            indexName,
            checkCreateDataView,
            checkHasManagePipeline,
          });

          return response.ok({ body: { hasImportPermission } });
        } catch (e) {
          logger.warn(`Unable to check import permission, error: ${e.message}`);
          return response.ok({ body: { hasImportPermission: false } });
        }
      }
    );

  /**
   * @apiGroup FileDataVisualizer
   *
   * @api {post} /internal/file_upload/analyze_file Analyze file data
   * @apiName AnalyzeFile
   * @apiDescription Performs analysis of the file data.
   *
   * @apiSchema (query) analyzeFileQuerySchema
   */
  router.versioned
    .post({
      path: '/internal/file_upload/analyze_file',
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['fileUpload:analyzeFile'],
        },
      },
      options: {
        body: {
          accepts: ['text/*', 'application/json'],
          maxBytes: MAX_FILE_SIZE_BYTES,
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: schema.any(),
            query: analyzeFileQuerySchema,
          },
        },
      },
      async (context, request, response) => {
        try {
          const esClient = (await context.core).elasticsearch.client;
          const result = await analyzeFile(esClient, request.body, request.query);
          return response.ok({ body: result });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      }
    );

  /**
   * @apiGroup FileDataVisualizer
   *
   * @api {post} /internal/file_upload/import Import file data
   * @apiName ImportFile
   * @apiDescription Imports file data into elasticsearch index.
   *
   * @apiSchema (query) importFileQuerySchema
   * @apiSchema (body) importFileBodySchema
   */
  router.versioned
    .post({
      path: '/internal/file_upload/import',
      access: 'internal',
      options: {
        body: {
          accepts: ['application/json'],
          maxBytes: MAX_FILE_SIZE_BYTES,
        },
      },
    })
    .addVersion(
      {
        version: '1',
        security: {
          authz: {
            enabled: false,
            reason:
              'This route is opted out from authorization because permissions will be checked by elasticsearch',
          },
        },
        validate: {
          request: {
            query: importFileQuerySchema,
            body: importFileBodySchema,
          },
        },
      },
      async (context, request, response) => {
        try {
          const { id } = request.query;
          const { index, data, settings, mappings, ingestPipeline, createPipelines } = request.body;
          const esClient = (await context.core).elasticsearch.client;

          // `id` being `undefined` tells us that this is a new import due to create a new index.
          // follow-up import calls to just add additional data will include the `id` of the created
          // index, we'll ignore those and don't increment the counter.
          if (id === undefined) {
            await updateTelemetry();
          }

          const result = await importData(
            esClient,
            id,
            index,
            settings,
            mappings,
            // @ts-expect-error
            ingestPipeline,
            createPipelines,
            data
          );
          return response.ok({ body: result });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      }
    );

  /**
   * @apiGroup FileDataVisualizer
   *
   * @api {post} /internal/file_upload/index_exists ES indices exists wrapper checks if index exists
   * @apiName IndexExists
   */
  router.versioned
    .post({
      path: '/internal/file_upload/index_exists',
      access: 'internal',
    })
    .addVersion(
      {
        version: '1',
        security: {
          authz: {
            enabled: false,
            reason:
              'This route is opted out from authorization because permissions will be checked by elasticsearch',
          },
        },
        validate: {
          request: {
            body: schema.object({ index: schema.string() }),
          },
        },
      },
      async (context, request, response) => {
        try {
          const esClient = (await context.core).elasticsearch.client;
          const indexExists = await esClient.asCurrentUser.indices.exists(request.body);
          return response.ok({ body: { exists: indexExists } });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      }
    );

  /**
   * @apiGroup FileDataVisualizer
   *
   * @api {post} /internal/file_upload/time_field_range Get time field range
   * @apiName GetTimeFieldRange
   * @apiDescription Returns the time range for the given index and query using the specified time range.
   *
   * @apiSchema (body) getTimeFieldRangeSchema
   *
   * @apiSuccess {Object} start start of time range with epoch and string properties.
   * @apiSuccess {Object} end end of time range with epoch and string properties.
   */
  router.versioned
    .post({
      path: '/internal/file_upload/time_field_range',
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['fileUpload:analyzeFile'],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: schema.object({
              /** Index or indexes for which to return the time range. */
              index: schema.oneOf([schema.string(), schema.arrayOf(schema.string())]),
              /** Name of the time field in the index. */
              timeFieldName: schema.string(),
              /** Query to match documents in the index(es). */
              query: schema.maybe(schema.any()),
              runtimeMappings: schema.maybe(runtimeMappingsSchema),
            }),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { index, timeFieldName, query, runtimeMappings } = request.body;
          const esClient = (await context.core).elasticsearch.client;
          const resp = await getTimeFieldRange(
            esClient,
            index,
            timeFieldName,
            query,
            runtimeMappings
          );

          return response.ok({
            body: resp,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      }
    );

  /**
   * @apiGroup FileDataVisualizer
   *
   * @api {post} /internal/file_upload/preview_index_time_range Predict the time range for an index using example documents
   * @apiName PreviewIndexTimeRange
   * @apiDescription Predict the time range for an index using example documents
   */
  router.versioned
    .post({
      path: '/internal/file_upload/preview_index_time_range',
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['fileUpload:analyzeFile'],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: schema.object({
              docs: schema.arrayOf(schema.any()),
              pipeline: schema.any(),
              timeField: schema.string(),
            }),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { docs, pipeline, timeField } = request.body;
          const esClient = (await context.core).elasticsearch.client;
          const resp = await previewIndexTimeRange(esClient, timeField, pipeline, docs);

          return response.ok({
            body: resp,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      }
    );

  /**
   * @apiGroup FileDataVisualizer
   *
   * @api {post} /internal/file_upload/preview_tika_contents Returns the contents of a file using the attachment ingest processor
   * @apiName PreviewTikaContents
   * @apiDescription Preview the contents of a file using the attachment ingest processor
   */
  router.versioned
    .post({
      path: '/internal/file_upload/preview_tika_contents',
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['fileUpload:analyzeFile'],
        },
      },
      options: {
        body: {
          accepts: ['application/json'],
          maxBytes: MAX_TIKA_FILE_SIZE_BYTES,
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: schema.object({
              base64File: schema.string(),
            }),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { base64File } = request.body;
          const esClient = (await context.core).elasticsearch.client;
          const resp = await previewTikaContents(esClient, base64File);

          return response.ok({
            body: resp,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      }
    );

  /**
   * @apiGroup FileDataVisualizer
   *
   * @api {post} /internal/file_upload/remove_pipelines Remove a list of ingest pipelines
   * @apiName RemovePipelines
   * @apiDescription Remove a list of ingest pipelines by id
   */
  router.versioned
    .delete({
      path: '/internal/file_upload/remove_pipelines/{pipelineIds}',
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['fileUpload:analyzeFile'],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: schema.object({ pipelineIds: schema.string() }),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { pipelineIds } = request.params;
          const esClient = (await context.core).elasticsearch.client;

          const resp = await Promise.all(
            pipelineIds.split(',').map((id) => esClient.asCurrentUser.ingest.deletePipeline({ id }))
          );

          return response.ok({
            body: resp,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      }
    );
}
