/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import { executeEsql, esqlResponseToJson } from '@kbn/agent-builder-genai-utils';
import type { ConnectorCallbackRequest, ConnectorCallbackResult } from './grpc_client';

const MAX_RESPONSE_BYTES = 1_048_576;

export const handleElasticsearchCallback = async (
  cb: ConnectorCallbackRequest,
  esClient: IScopedClusterClient
): Promise<ConnectorCallbackResult> => {
  let params: Record<string, any> = {};
  if (cb.sub_action_params.length > 0) {
    try {
      params = JSON.parse(cb.sub_action_params.toString('utf8'));
    } catch (err) {
      return { status: 'error', error_message: `Invalid sub_action_params JSON: ${err}` };
    }
  }

  try {
    switch (cb.sub_action) {
      case 'esql': {
        if (!params.query || typeof params.query !== 'string') {
          return {
            status: 'error',
            error_message: "Missing required parameter 'query' for esql sub-action",
          };
        }
        const esqlResult = await executeEsql({
          query: params.query,
          limit: params.limit ?? 100,
          params: params.params,
          filter: params.filter,
          esClient: esClient.asCurrentUser,
        });
        const rows = esqlResponseToJson(esqlResult);
        const serialized = Buffer.from(JSON.stringify(rows));
        if (serialized.length > MAX_RESPONSE_BYTES) {
          return {
            status: 'error',
            error_message:
              'Response too large (limit 1 MiB). Request fewer fields or smaller page.',
          };
        }
        return { status: 'ok', data: serialized };
      }

      case 'resolve_index': {
        const response = await esClient.asCurrentUser.indices.resolveIndex({
          name: params.pattern,
        });
        const serialized = Buffer.from(JSON.stringify(response));
        if (serialized.length > MAX_RESPONSE_BYTES) {
          return {
            status: 'error',
            error_message:
              'Response too large (limit 1 MiB). Request fewer fields or smaller page.',
          };
        }
        return { status: 'ok', data: serialized };
      }

      case 'get_mapping': {
        const response = await esClient.asCurrentUser.fieldCaps({
          index: params.pattern,
          fields: params.fields ?? '*',
          include_empty_fields: false,
        });
        const serialized = Buffer.from(JSON.stringify(response));
        if (serialized.length > MAX_RESPONSE_BYTES) {
          return {
            status: 'error',
            error_message:
              'Response too large (limit 1 MiB). Request fewer fields or smaller page.',
          };
        }
        return { status: 'ok', data: serialized };
      }

      default:
        return {
          status: 'error',
          error_message: `Unknown sub-action '${cb.sub_action}'. Available: esql, resolve_index, get_mapping`,
        };
    }
  } catch (err) {
    return { status: 'error', error_message: String(err) };
  }
};
