/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpHandler } from '@kbn/core-http-browser';
import { ERROR_UPDATING_UNALLOWED_VALUES } from '../translations';

const FIX_INDICES_MAPPINGS = '/internal/ecs_data_quality_dashboard/fix_index_mapping';

export const fixIndicesMappings = async ({
  abortController,
  httpFetch,
  body,
}: {
  abortController?: AbortController;
  httpFetch: HttpHandler;
  body: {
    indexName: string;
    indexTemplate: string;
    expectedMappings: Record<string, string>;
  };
}) => {
  try {
    return await httpFetch<{ errors: boolean; taskId: string; result: unknown }>(
      FIX_INDICES_MAPPINGS,
      {
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        signal: abortController?.signal,
        cache: 'no-cache',
      }
    );
  } catch (e) {
    throw new Error(
      ERROR_UPDATING_UNALLOWED_VALUES({
        details: e.message,
      })
    );
  }
};
