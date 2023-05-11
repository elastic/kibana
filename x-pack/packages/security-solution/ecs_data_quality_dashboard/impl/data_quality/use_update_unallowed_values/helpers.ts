/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpHandler } from '@kbn/core-http-browser';
import { ERROR_UPDATING_UNALLOWED_VALUES } from '../translations';

const UPDATE_UNALLOWED_FIELD_VALUES =
  '/internal/ecs_data_quality_dashboard/update_unallowed_field_values';

export const updateUnallowedValues = async ({
  abortController,
  httpFetch,
  body,
}: {
  abortController?: AbortController;
  httpFetch: HttpHandler;
  body: Array<{
    id: string;
    indexFieldName: string;
    indexName: string;
    value: string;
  }>;
}) => {
  try {
    return await httpFetch<{ errors: boolean; items: unknown[] }>(UPDATE_UNALLOWED_FIELD_VALUES, {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      signal: abortController?.signal,
      cache: 'no-cache',
    });
  } catch (e) {
    throw new Error(
      ERROR_UPDATING_UNALLOWED_VALUES({
        details: e.message,
      })
    );
  }
};
