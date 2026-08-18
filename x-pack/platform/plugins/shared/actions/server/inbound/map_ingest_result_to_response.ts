/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaResponseFactory } from '@kbn/core/server';

import type { IngestInboundEventResult } from './ingest';

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
    case 'accepted':
      return response.accepted({ body: result.body });
  }
};
