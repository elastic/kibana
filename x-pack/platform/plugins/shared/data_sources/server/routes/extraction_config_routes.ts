/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, StartServicesAccessor } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { DataSourcesServerStartDependencies } from '../types';
import {
  getExtractionConfig,
  updateExtractionConfig,
  EXTRACTION_CONFIG_SO_TYPE,
} from '../extraction_config';

const EXTRACTION_CONFIG_PATH = '/internal/data_sources/extraction_config';
const INFERENCE_ENDPOINTS_PATH = '/internal/data_sources/inference_endpoints';
const WORKFLOWS_PATH = '/internal/data_sources/workflows';

interface RouteDependencies {
  router: IRouter;
  getStartServices: StartServicesAccessor<DataSourcesServerStartDependencies>;
  workflowManagement: WorkflowsServerPluginSetup;
}

export function registerExtractionConfigRoutes({
  router,
  getStartServices,
  workflowManagement,
}: RouteDependencies) {
  router.get(
    {
      path: EXTRACTION_CONFIG_PATH,
      validate: false,
      security: {
        authz: {
          enabled: false,
          reason: 'Authorization is delegated to underlying service plugins',
        },
      },
    },
    async (_context, _request, response) => {
      try {
        const [coreStart] = await getStartServices();
        const soClient = coreStart.savedObjects.createInternalRepository([
          EXTRACTION_CONFIG_SO_TYPE,
        ]);
        const config = await getExtractionConfig(soClient);
        return response.ok({ body: config });
      } catch (error) {
        return response.customError({
          statusCode: 500,
          body: { message: `Failed to get extraction config: ${(error as Error).message}` },
        });
      }
    }
  );

  router.put(
    {
      path: EXTRACTION_CONFIG_PATH,
      validate: {
        body: schema.object({
          method: schema.oneOf([
            schema.literal('tika'),
            schema.literal('inference'),
            schema.literal('workflow'),
            schema.literal('connector'),
          ]),
          inferenceId: schema.maybe(schema.string()),
          workflowId: schema.maybe(schema.string()),
          connectorId: schema.maybe(schema.string()),
          formatOverrides: schema.maybe(
            schema.recordOf(
              schema.string(),
              schema.object({
                method: schema.oneOf([
                  schema.literal('tika'),
                  schema.literal('inference'),
                  schema.literal('workflow'),
                  schema.literal('connector'),
                ]),
                inferenceId: schema.maybe(schema.string()),
                workflowId: schema.maybe(schema.string()),
                connectorId: schema.maybe(schema.string()),
              })
            )
          ),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'Authorization is delegated to underlying service plugins',
        },
      },
    },
    async (_context, request, response) => {
      try {
        const [coreStart] = await getStartServices();
        const soClient = coreStart.savedObjects.createInternalRepository([
          EXTRACTION_CONFIG_SO_TYPE,
        ]);
        const updated = await updateExtractionConfig(soClient, request.body);
        return response.ok({ body: updated });
      } catch (error) {
        return response.customError({
          statusCode: 500,
          body: { message: `Failed to update extraction config: ${(error as Error).message}` },
        });
      }
    }
  );

  router.get(
    {
      path: INFERENCE_ENDPOINTS_PATH,
      validate: false,
      security: {
        authz: {
          enabled: false,
          reason: 'Authorization is delegated to underlying service plugins',
        },
      },
    },
    async (context, _request, response) => {
      const coreContext = await context.core;
      const esClient = coreContext.elasticsearch.client.asCurrentUser;

      try {
        const { endpoints } = await esClient.inference.get({
          inference_id: '_all',
          task_type: 'completion',
        });

        const mapped = (endpoints ?? []).map((ep) => ({
          inference_id: ep.inference_id,
          service: ep.service,
          task_type: ep.task_type,
        }));

        return response.ok({ body: { endpoints: mapped } });
      } catch (error) {
        return response.ok({ body: { endpoints: [] } });
      }
    }
  );

  router.get(
    {
      path: WORKFLOWS_PATH,
      validate: false,
      security: {
        authz: {
          enabled: false,
          reason: 'Authorization is delegated to underlying service plugins',
        },
      },
    },
    async (context, _request, response) => {
      try {
        const coreContext = await context.core;
        const spaceId = coreContext.savedObjects.client.getCurrentNamespace() ?? 'default';
        const list = await workflowManagement.management.getWorkflows(
          { size: 200, page: 1, enabled: [true] },
          spaceId
        );

        const workflows = list.results.map((wf) => {
          const inputProps =
            (wf.definition?.inputs as {
              properties?: Record<string, { type?: string }>;
              required?: string[];
            } | undefined) ?? {};
          const props = inputProps.properties ?? {};
          const required = new Set(inputProps.required ?? []);

          const contentOk = props.content?.type === 'string';
          const filenameOk = props.filename?.type === 'string';
          const hasOptionalDocId = !props.doc_id || props.doc_id.type === 'string';

          const compatible = contentOk && filenameOk && hasOptionalDocId;

          const issues: string[] = [];
          if (!contentOk) issues.push('missing input "content" (string)');
          if (!filenameOk) issues.push('missing input "filename" (string)');
          if (!hasOptionalDocId) issues.push('"doc_id" must be string');
          if (!required.has('content')) issues.push('"content" should be required');
          if (!required.has('filename')) issues.push('"filename" should be required');

          return {
            id: wf.id,
            name: wf.name,
            description: wf.description,
            compatible,
            issues: issues.length > 0 ? issues : undefined,
          };
        });

        return response.ok({ body: { workflows } });
      } catch (error) {
        return response.ok({ body: { workflows: [] } });
      }
    }
  );
}
