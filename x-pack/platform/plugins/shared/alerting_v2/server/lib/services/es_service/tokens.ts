/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { createToken } from '@kbn/core-di';

export const EsServiceInternalToken = createToken<ElasticsearchClient>(
  'alerting_v2.EsServiceInternal'
);

export const EsServiceScopedToken = createToken<ElasticsearchClient>('alerting_v2.EsServiceScoped');

/**
 * Request-scoped current-user client with `projectRouting: 'space'`:
 * `elasticsearch.client.asScoped(request, { projectRouting: 'space' }).asCurrentUser`.
 * Used for rule-execution queries against user data so they are scoped to the originating
 * space/project when CPS is enabled (falls back to local routing when CPS is disabled).
 */
export const EsServiceScopedSpaceRoutingToken = createToken<ElasticsearchClient>(
  'alerting_v2.EsServiceScopedSpaceRouting'
);
