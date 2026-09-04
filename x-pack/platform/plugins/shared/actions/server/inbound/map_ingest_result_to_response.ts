/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpResponsePayload, KibanaResponseFactory } from '@kbn/core/server';
import { isJsonSerializableSpokeBody } from '@kbn/connector-specs';

import type { IngestInboundEventResult } from './ingest';

const spokeHttpBody = (body: unknown): HttpResponsePayload | undefined => {
  if (body === undefined || body === null) {
    return undefined;
  }
  if (typeof body === 'string') {
    return body;
  }
  if (isJsonSerializableSpokeBody(body)) {
    return body as HttpResponsePayload;
  }
  return undefined;
};

export const mapIngestResultToResponse = (
  result: IngestInboundEventResult,
  response: KibanaResponseFactory
) => {
  switch (result.status) {
    case 'forbidden':
      return response.forbidden({ body: result.body });
    case 'not_found':
      return response.notFound();
    case 'error':
      return response.customError({
        statusCode: result.statusCode,
        body: result.body,
      });
    case 'spoke_http': {
      const body = spokeHttpBody(result.body);
      return response.custom({
        statusCode: result.statusCode,
        ...(body !== undefined ? { body } : {}),
        ...(result.headers !== undefined ? { headers: result.headers } : {}),
      });
    }
    case 'accepted':
      return response.accepted({ body: result.body });
  }
};
