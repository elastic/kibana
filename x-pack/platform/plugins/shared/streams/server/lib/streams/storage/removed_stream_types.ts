/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { DiagnosticResult } from '@elastic/elasticsearch';
import { isObject } from 'lodash';

/**
 * The 404 thrown by the streams storage client when the requested document is a removed stream
 * type. It is a regular Elasticsearch not-found error, so existing not-found handling still applies.
 */
export class RemovedStreamTypeNotFoundError extends errors.ResponseError {
  constructor() {
    super({
      meta: {
        aborted: false,
        attempts: 1,
        connection: null,
        context: null,
        name: 'resource_not_found_exception',
        request: {} as unknown as DiagnosticResult['meta']['request'],
      },
      warnings: [],
      body: 'resource_not_found_exception',
      statusCode: 404,
    });
  }
}

/**
 * Returns true for stored definitions of stream types that no longer exist (query streams and
 * draft streams). They may still be present in `.kibana_streams` and are hidden from all reads.
 */
export const isRemovedStreamTypeDefinition = (source: unknown): boolean => {
  if (!isObject(source)) {
    return false;
  }
  const definition = source as Record<string, unknown>;

  if (definition.type === 'query' || (!('ingest' in definition) && 'query' in definition)) {
    return true;
  }

  const { ingest } = definition;
  return (
    isObject(ingest) &&
    'wired' in ingest &&
    isObject(ingest.wired) &&
    (ingest.wired as { draft?: unknown }).draft === true
  );
};
