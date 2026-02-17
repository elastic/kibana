/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { parse } from 'yaml';
import type { DataCatalog } from './data_catalog';
import { API_BASE_PATH, loadWorkflows, type DataSource } from '../common';

async function enhanceWithWorkflowContent(types: DataSource[]) {
  return Promise.all(
    types.map(async (type) => {
      const workflowInfos = await loadWorkflows(type.workflows);
      const content: Record<string, string> = {};
      for (const info of workflowInfos) {
        let parsed;
        try {
          parsed = parse(info.content);
        } catch (error) {
          throw new Error(
            `Failed to parse workflow content for data source '${type.id}': ${
              (error as Error).message
            }`,
            { cause: error }
          );
        }
        if (!parsed) {
          throw new Error(`Workflow for data source '${type.id}' has empty or invalid content`);
        }
        if (!parsed.name) {
          throw new Error(
            `Workflow for data source '${type.id}' is missing required 'name' attribute`
          );
        }
        content[parsed.name] = info.content;
      }
      return {
        ...type,
        workflows: {
          directory: type.workflows.directory,
          content,
        },
      };
    })
  );
}

export function registerRoutes(router: IRouter, dataCatalog: DataCatalog) {
  // GET /api/data_sources_registry/types
  router.get(
    {
      path: `${API_BASE_PATH}/types`,
      validate: {
        query: schema.object({
          includeWorkflows: schema.boolean({ defaultValue: false }),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'Not needed right now',
        },
      },
    },
    async (context, request, response) => {
      const types = dataCatalog.list();

      if (request.query.includeWorkflows) {
        const typesWithWorkflows = await enhanceWithWorkflowContent(types);
        return response.ok({ body: typesWithWorkflows });
      }

      return response.ok({ body: types });
    }
  );

  // GET /api/data_sources_registry/types/{id}
  router.get(
    {
      path: `${API_BASE_PATH}/types/{id}`,
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'Not needed right now',
        },
      },
    },
    async (context, request, response) => {
      try {
        const type = dataCatalog.get(request.params.id);
        if (!type) {
          return response.notFound({ body: `Type ${request.params.id} not found` });
        }
        return response.ok({ body: type });
      } catch (err) {
        return response.notFound({ body: err.message });
      }
    }
  );
}
