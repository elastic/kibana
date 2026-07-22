/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type { TimeRange } from '@kbn/es-query';
import { getESQLTimeFieldFromQuery } from '@kbn/esql-utils';
import { CUSTOM_CONTENT_RENDER_ROUTE } from '../../common/constants';

export async function callRenderRoute(
  http: HttpStart,
  params: { template: string; esqlQuery: string; timeRange?: TimeRange | null },
  signal?: AbortSignal
): Promise<string> {
  const { template, esqlQuery, timeRange } = params;

  let timeField: string | undefined;
  if (timeRange) {
    timeField = (await getESQLTimeFieldFromQuery({ query: esqlQuery, http })) ?? undefined;
  }

  const { html } = await http.post<{ html: string }>(CUSTOM_CONTENT_RENDER_ROUTE, {
    body: JSON.stringify({ template, esqlQuery, timeRange, timeField }),
    signal,
  });
  return html;
}
