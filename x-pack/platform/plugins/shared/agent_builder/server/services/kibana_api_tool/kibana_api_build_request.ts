/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildKibanaRequest } from '@kbn/workflows';
import type { RequestOptions } from '@kbn/workflows/types/latest';
import type { KibanaApiOperationConfig } from '@kbn/agent-builder-common/tools';

export function fillPathTemplate(
  template: string,
  pathParams: Record<string, unknown> | undefined
): string {
  const params = pathParams ?? {};
  let out = template;
  for (const [key, value] of Object.entries(params)) {
    out = out.replace(`{${key}}`, encodeURIComponent(String(value)));
  }
  return out;
}

function toQueryStringRecord(
  query: Record<string, unknown> | undefined
): Record<string, string> | undefined {
  if (!query || Object.keys(query).length === 0) {
    return undefined;
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) {
      continue;
    }
    if (Array.isArray(v)) {
      out[k] = v.map(String).join(',');
    } else if (typeof v === 'object') {
      out[k] = JSON.stringify(v);
    } else {
      out[k] = String(v);
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export interface KibanaApiToolCallParams {
  path?: Record<string, unknown>;
  query?: Record<string, unknown>;
  body?: Record<string, unknown> | unknown;
}

/**
 * Builds a loopback Kibana HTTP request from an OpenAPI operation and resolved params
 * via `buildKibanaRequest('kibana.request', { method, path, body, query })`.
 *
 * Space is applied in `execute_kibana_api_http` via `addSpaceIdToPath`, so `spaceId` is not passed here.
 */
export function buildKibanaApiHttpRequest(
  operation: KibanaApiOperationConfig,
  params: KibanaApiToolCallParams
): RequestOptions {
  const pathVals = params.path ?? {};
  const queryVals = params.query ?? {};
  const bodyVals =
    params.body && typeof params.body === 'object' && !Array.isArray(params.body)
      ? (params.body as Record<string, unknown>)
      : undefined;

  const filledPath = fillPathTemplate(operation.path_template, pathVals);
  const stringQuery = toQueryStringRecord(queryVals);

  return buildKibanaRequest('kibana.request', {
    method: operation.method,
    path: filledPath,
    body: bodyVals && Object.keys(bodyVals).length > 0 ? bodyVals : undefined,
    query: stringQuery,
  });
}
