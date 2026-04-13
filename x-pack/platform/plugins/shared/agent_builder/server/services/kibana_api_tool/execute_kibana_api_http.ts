/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { format } from 'url';
import { pickBy } from 'lodash';
import type { KibanaRequest } from '@kbn/core-http-server';
import { addSpaceIdToPath, getSpaceIdFromPath } from '@kbn/spaces-plugin/common';
import type { RequestOptions } from '@kbn/workflows/types/latest';
import { formatKibanaApiHttpFailure } from './kibana_api_http_error_format';

const COPIED_HEADER_NAMES = [
  'accept-encoding',
  'accept-language',
  'accept',
  'authorization',
  'content-type',
  'cookie',
  'kbn-build-number',
  'kbn-version',
  'origin',
  'referer',
  'user-agent',
  'x-elastic-internal-origin',
  'x-elastic-product-origin',
  'x-kbn-context',
];

/**
 * Loopback HTTP to this Kibana instance with the interactive user's headers
 * (same idea as observability_ai_assistant `kibana.ts`).
 */
export async function executeKibanaApiHttp(opts: {
  request: KibanaRequest;
  /** Resolved Kibana origin (publicBaseUrl, cloud URL, or bind address fallback) */
  kibanaBaseUrl: string;
  serverBasePath: string;
  spaceId: string;
  requestOptions: RequestOptions;
}): Promise<unknown> {
  const { request, kibanaBaseUrl, serverBasePath, spaceId, requestOptions } = opts;
  const { method, path: apiPath, body, query, headers: extraHeaders } = requestOptions;

  const parsedKibanaOrigin = new URL(kibanaBaseUrl);
  const incomingRequestUrl = request.rewrittenUrl || request.url;
  const { spaceId: spaceFromRequest } = getSpaceIdFromPath(
    incomingRequestUrl.pathname,
    serverBasePath
  );
  const effectiveSpace = spaceId || spaceFromRequest;

  const pathnameWithSpace = addSpaceIdToPath(serverBasePath, effectiveSpace, apiPath);

  const nextUrl = {
    host: parsedKibanaOrigin.host,
    protocol: parsedKibanaOrigin.protocol,
    pathname: pathnameWithSpace,
    query: query && Object.keys(query).length > 0 ? query : undefined,
  };

  const headerSource = request.headers;
  const headers = pickBy(headerSource, (value, key) => {
    return COPIED_HEADER_NAMES.includes(key.toLowerCase()) || key.toLowerCase().startsWith('sec-');
  }) as Record<string, string>;

  const mergedHeaders: Record<string, string> = {
    ...headers,
    ...(extraHeaders ?? {}),
  };

  const loopbackRequestUrl = format(nextUrl);

  const requestBodyPayload =
    body === undefined || body === null ? undefined : typeof body === 'string' ? body : body;

  try {
    const response = await axios({
      method,
      headers: mergedHeaders,
      url: loopbackRequestUrl,
      // Pass a plain object so axios sets `Content-Type: application/json` and serializes correctly.
      // Pre-stringified JSON can be mis-parsed by Hapi depending on headers.
      data: requestBodyPayload,
    });

    return response.data;
  } catch (err) {
    throw new Error(formatKibanaApiHttpFailure(err, loopbackRequestUrl));
  }
}
