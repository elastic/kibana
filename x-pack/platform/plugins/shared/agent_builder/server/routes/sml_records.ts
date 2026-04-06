/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'node:path';
import { schema } from '@kbn/config-schema';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import { publicApiPath } from '../../common/constants';
import { AGENT_BUILDER_READ_SECURITY, AGENT_BUILDER_WRITE_SECURITY } from './route_security';
import type {
  GetSmlRecordResponse,
  CreateOrUpdateSmlRecordResponse,
  DeleteSmlRecordResponse,
} from '../../common/http_api/sml_records';

const RECORD_ID_PARAMS_SCHEMA = schema.object({
  id: schema.string({
    meta: { description: 'The unique identifier of the SML record.' },
  }),
});

/**
 * Validation schema for the SML record body (create or update).
 *
 * `user_defined` is not accepted in the body — it is always set to `true` by the API.
 * `semantic_title` and `semantic_content` are not accepted — they are copied from
 * `title` and `content` at write time.
 */
const RECORD_BODY_SCHEMA = schema.object({
  type: schema.string({
    minLength: 1,
    meta: { description: 'The SML record type (e.g., "index").' },
  }),
  title: schema.string({
    minLength: 1,
    meta: { description: 'Display title for the record.' },
  }),
  origin_id: schema.string({
    minLength: 1,
    meta: { description: 'The origin identifier (e.g., index name, saved object ID).' },
  }),
  content: schema.string({
    minLength: 1,
    meta: { description: 'The searchable content / LLM-generated summary.' },
  }),
  spaces: schema.arrayOf(schema.string(), {
    minSize: 1,
    meta: { description: 'Space IDs this record belongs to. Use ["*"] for all spaces.' },
  }),
  permissions: schema.maybe(
    schema.arrayOf(schema.string(), {
      meta: { description: 'Kibana privileges required to access this record. Defaults to [].' },
    })
  ),
  tags: schema.maybe(
    schema.arrayOf(schema.string(), {
      meta: { description: 'Optional tags for categorization and filtering.' },
    })
  ),
  params: schema.maybe(
    schema.recordOf(schema.string(), schema.any(), {
      meta: {
        description: 'Type-specific parameters (e.g., index_pattern for type "index").',
      },
    })
  ),
});

export function registerSmlRecordsRoutes({
  router,
  coreSetup,
  getInternalServices,
  logger,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  // Create or update an SML record
  router.versioned
    .put({
      path: `${publicApiPath}/sml/{id}`,
      security: AGENT_BUILDER_WRITE_SECURITY,
      access: 'public',
      summary: 'Create or update an SML record',
      description:
        'Create a new SML record or update an existing one. Records are always marked as user_defined=true to prevent overwriting by crawl events.',
      options: {
        tags: ['sml-records', 'oas-tag:agent builder'],
        availability: { since: '9.5.0' },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            params: RECORD_ID_PARAMS_SCHEMA,
            body: RECORD_BODY_SCHEMA,
          },
        },
        options: {
          oasOperationObject: () =>
            path.join(__dirname, 'examples/sml_records_create_or_update.yaml'),
        },
      },
      wrapHandler(
        async (ctx, request, response) => {
          const { sml } = getInternalServices();
          const [coreStart] = await coreSetup.getStartServices();
          const esClient = coreStart.elasticsearch.client.asScoped(request).asInternalUser;
          const record = await sml.createOrUpdateRecord({
            id: request.params.id,
            document: request.body,
            esClient,
          });
          return response.ok<CreateOrUpdateSmlRecordResponse>({ body: record });
        },
        {
          featureFlag: AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID,
        }
      )
    );

  // Get an SML record by ID
  router.versioned
    .get({
      path: `${publicApiPath}/sml/{id}`,
      security: AGENT_BUILDER_READ_SECURITY,
      access: 'public',
      summary: 'Get an SML record by ID',
      description: 'Retrieve a specific SML record by its unique identifier.',
      options: {
        tags: ['sml-records', 'oas-tag:agent builder'],
        availability: { since: '9.5.0' },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            params: RECORD_ID_PARAMS_SCHEMA,
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/sml_records_get_by_id.yaml'),
        },
      },
      wrapHandler(
        async (ctx, request, response) => {
          const { sml } = getInternalServices();
          const [coreStart] = await coreSetup.getStartServices();
          const esClient = coreStart.elasticsearch.client.asScoped(request).asInternalUser;
          const record = await sml.getRecord({ id: request.params.id, esClient });
          return response.ok<GetSmlRecordResponse>({ body: record });
        },
        {
          featureFlag: AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID,
        }
      )
    );

  // Delete an SML record
  router.versioned
    .delete({
      path: `${publicApiPath}/sml/{id}`,
      security: AGENT_BUILDER_WRITE_SECURITY,
      access: 'public',
      summary: 'Delete an SML record',
      description: 'Delete an SML record by its unique identifier. This action cannot be undone.',
      options: {
        tags: ['sml-records', 'oas-tag:agent builder'],
        availability: { since: '9.5.0' },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            params: RECORD_ID_PARAMS_SCHEMA,
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/sml_records_delete.yaml'),
        },
      },
      wrapHandler(
        async (ctx, request, response) => {
          const { sml } = getInternalServices();
          const [coreStart] = await coreSetup.getStartServices();
          const esClient = coreStart.elasticsearch.client.asScoped(request).asInternalUser;
          const success = await sml.deleteRecord({ id: request.params.id, esClient });
          return response.ok<DeleteSmlRecordResponse>({ body: { success } });
        },
        {
          featureFlag: AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID,
        }
      )
    );
}
