/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import type {
  KibanaApiOperationConfig,
  KibanaApiToolConfig,
} from '@kbn/agent-builder-common/tools';
import { createBadRequestError } from '@kbn/agent-builder-common';
import { cleanPrompt } from '@kbn/agent-builder-genai-utils/prompts';
import { otherResult } from '@kbn/agent-builder-genai-utils/tools/utils/results';
import type { Logger } from '@kbn/logging';
import type { ToolTypeDefinition } from '../definitions';
import { buildKibanaApiHttpRequest } from '../../../kibana_api_tool/kibana_api_build_request';
import { buildKibanaApiMultiOperationToolParamsSchema } from '../../../kibana_api_tool/kibana_api_tool_zod_schema';
import { executeKibanaApiHttp } from '../../../kibana_api_tool/execute_kibana_api_http';
import {
  getCachedOpenApiDocument,
  getKibanaOpenApiOperation,
} from '../../../kibana_api_tool/openapi_kibana_catalog';
import { findWorkflowKibanaConnectorType } from '../../../kibana_api_tool/match_workflow_kibana_connector';
import { configurationSchema, configurationUpdateSchema } from './schemas';

/** Pre-migration persisted shape (single operation). */
interface LegacyKibanaApiPersistedConfig {
  operation_id: string;
  method: string;
  path_template: string;
  workflow_connector_type?: string | null;
}

type PersistedKibanaApiConfig = KibanaApiToolConfig | LegacyKibanaApiPersistedConfig;

function isLegacyKibanaApiConfig(config: object): config is LegacyKibanaApiPersistedConfig {
  const ops = (config as KibanaApiToolConfig).operations;
  const hasNonEmptyOperations = Array.isArray(ops) && ops.length > 0;
  return (
    !hasNonEmptyOperations &&
    'operation_id' in config &&
    typeof (config as LegacyKibanaApiPersistedConfig).operation_id === 'string' &&
    (config as LegacyKibanaApiPersistedConfig).operation_id.length > 0
  );
}

function normalizePersistedKibanaApiConfig(config: PersistedKibanaApiConfig): KibanaApiToolConfig {
  if (!config || typeof config !== 'object') {
    return { operations: [] };
  }
  const raw = config as unknown as Record<string, unknown>;
  const persistedOps = raw.operations;
  if (Array.isArray(persistedOps) && persistedOps.length > 0) {
    return { operations: persistedOps as KibanaApiOperationConfig[] };
  }
  if (isLegacyKibanaApiConfig(config)) {
    return {
      operations: [
        {
          operation_id: config.operation_id,
          method: config.method ?? '',
          path_template: config.path_template ?? '',
          workflow_connector_type: config.workflow_connector_type ?? null,
        },
      ],
    };
  }
  return { operations: [] };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function validateOperationsList(
  logger: Logger,
  rawOps: KibanaApiOperationConfig[]
): Promise<KibanaApiOperationConfig[]> {
  if (!rawOps.length) {
    throw createBadRequestError('Select at least one Kibana API operation');
  }
  const seen = new Set<string>();
  const operations: KibanaApiOperationConfig[] = [];
  for (const entry of rawOps) {
    const oid = entry.operation_id?.trim();
    if (!oid) {
      throw createBadRequestError('Each operation must have a non-empty operation_id');
    }
    if (seen.has(oid)) {
      throw createBadRequestError(`Duplicate operation_id in tool configuration: ${oid}`);
    }
    seen.add(oid);
    const indexed = getKibanaOpenApiOperation(logger, oid);
    if (!indexed) {
      throw createBadRequestError(`Unknown OpenAPI operation_id: ${oid}`);
    }
    const workflowType = findWorkflowKibanaConnectorType(indexed.method, indexed.path_template);
    operations.push({
      operation_id: oid,
      method: indexed.method,
      path_template: indexed.path_template,
      workflow_connector_type: workflowType,
    });
  }
  return operations;
}

export interface KibanaApiToolTypeDeps {
  logger: Logger;
  getKibanaLoopbackBaseUrl: () => string;
  serverBasePath: string;
}

export const getKibanaApiToolType = ({
  logger,
  getKibanaLoopbackBaseUrl,
  serverBasePath,
}: KibanaApiToolTypeDeps): ToolTypeDefinition<
  ToolType.kibana_api,
  KibanaApiToolConfig,
  z.ZodType,
  PersistedKibanaApiConfig
> => {
  return {
    toolType: ToolType.kibana_api,
    convertFromPersistence: (config: PersistedKibanaApiConfig) =>
      normalizePersistedKibanaApiConfig(config),
    getDynamicProps: (config) => {
      return {
        getSchema: () => {
          const root = getCachedOpenApiDocument(logger);
          const entries = [];
          for (const op of config.operations) {
            const indexed = getKibanaOpenApiOperation(logger, op.operation_id);
            if (!indexed) {
              return z
                .object({})
                .describe(
                  'OpenAPI catalog has no entry for a configured operation_id. Re-save the tool after choosing operations from the catalog.'
                );
            }
            entries.push({ operation: op, indexed });
          }
          return buildKibanaApiMultiOperationToolParamsSchema(root, entries);
        },
        getLlmDescription: ({ description, config: toolConfig }) => {
          const blocks: string[] = [];
          for (const op of toolConfig.operations) {
            const indexed = getKibanaOpenApiOperation(logger, op.operation_id);
            if (!indexed) {
              blocks.push(`- **${op.operation_id}** (catalog entry missing)`);
              continue;
            }
            const api = indexed.operation;
            const apiSummary = typeof api.summary === 'string' ? api.summary.trim() : '';
            const apiDescription =
              typeof api.description === 'string' ? api.description.trim() : '';
            blocks.push(
              [
                `### \`${op.operation_id}\``,
                `- **HTTP** \`${indexed.method}\` \`${indexed.path_template}\``,
                apiSummary ? `- **Summary:** ${apiSummary}` : '',
                apiDescription && apiDescription !== apiSummary
                  ? `- **OpenAPI description:**\n${apiDescription}`
                  : '',
                `- Tool arguments use **operation_id** (exactly this string) plus operation-specific \`path\`, \`query\`, and/or \`body\` as in the JSON Schema.`,
              ]
                .filter(Boolean)
                .join('\n')
            );
          }

          return cleanPrompt(`${description}

## Kibana API bundle (${toolConfig.operations.length} operation(s))
${blocks.join('\n\n')}
- The parameter schema is a discriminated union on **operation_id**: pick one operation, then supply only the path/query/body fields defined for that branch (types come from OpenAPI).
`);
        },
        getHandler: () => {
          return async (params, { request, spaceId }) => {
            const kibanaBaseUrl = getKibanaLoopbackBaseUrl();
            if (!isPlainObject(params)) {
              return {
                results: [otherResult({ response: { error: 'Invalid tool parameters' } })],
              };
            }
            const operationId =
              typeof params.operation_id === 'string' ? params.operation_id.trim() : '';
            if (!operationId) {
              return {
                results: [
                  otherResult({
                    response: {
                      error: 'Missing operation_id — pass one of the configured operation ids.',
                    },
                  }),
                ],
              };
            }
            const opConfig = config.operations.find((o) => o.operation_id === operationId);
            if (!opConfig) {
              return {
                results: [
                  otherResult({
                    response: {
                      error: `operation_id "${operationId}" is not in this tool's allowlist. Valid: ${config.operations
                        .map((o) => o.operation_id)
                        .join(', ')}`,
                    },
                  }),
                ],
              };
            }

            const pathVal = params.path;
            const queryVal = params.query;
            const bodyVal = params.body;

            const requestOptions = buildKibanaApiHttpRequest(opConfig, {
              path: isPlainObject(pathVal) ? pathVal : undefined,
              query: isPlainObject(queryVal) ? queryVal : undefined,
              body: bodyVal,
            });

            const mergedHeaders = { ...(requestOptions.headers ?? {}) };
            const m = (requestOptions.method ?? 'GET').toUpperCase();
            if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(m) && !mergedHeaders['kbn-xsrf']) {
              mergedHeaders['kbn-xsrf'] = 'true';
            }

            const data = await executeKibanaApiHttp({
              request,
              kibanaBaseUrl,
              serverBasePath,
              spaceId,
              requestOptions: { ...requestOptions, headers: mergedHeaders },
            });

            return {
              results: [otherResult({ response: data })],
            };
          };
        },
      };
    },
    createSchema: configurationSchema,
    updateSchema: configurationUpdateSchema,
    validateForCreate: async ({ config }) => {
      if (!config.operations?.length) {
        throw createBadRequestError('Select at least one Kibana API operation');
      }
      const operations = await validateOperationsList(logger, config.operations);
      return { operations };
    },
    validateForUpdate: async ({ update, current }) => {
      const mergedOps = update.operations !== undefined ? update.operations : current.operations;
      if (!mergedOps?.length) {
        throw createBadRequestError('Select at least one Kibana API operation');
      }
      const operations = await validateOperationsList(logger, mergedOps);
      return { operations };
    },
  };
};
