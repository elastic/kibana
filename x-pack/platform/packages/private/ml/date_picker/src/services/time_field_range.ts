/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

import type { HttpStart } from '@kbn/core/public';

import type { GetTimeFieldRangeResponse } from './types';

/**
 * Options definition for the `getTimeFieldRange` function.
 */
interface GetTimeFieldRangeOptions {
  /**
   * The index to be queried.
   */
  index: string;
  /**
   * Optional time field name.
   */
  timeFieldName?: string;
  /**
   * Optional DSL query.
   */
  query?: QueryDslQueryContainer;
  /**
   * Optional runtime mappings.
   */
  runtimeMappings?: estypes.MappingRuntimeFields;
  /**
   * HTTP client
   */
  http: HttpStart;
  /**
   * API path ('/internal/file_upload/time_field_range')
   */
  path: string;

  signal?: AbortSignal;
}

/**
 *
 * @param options - GetTimeFieldRangeOptions
 * @returns GetTimeFieldRangeResponse
 */
export async function getTimeFieldRange(options: GetTimeFieldRangeOptions) {
  const { http, path, signal, ...body } = options;

  return await http.fetch<GetTimeFieldRangeResponse>({
    path,
    method: 'POST',
    body: JSON.stringify(body),
    version: '1',
    ...(signal ? { signal } : {}),
  });
}
