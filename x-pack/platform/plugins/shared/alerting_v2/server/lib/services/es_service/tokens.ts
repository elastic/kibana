/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { TaskScopedClusterClients } from '@kbn/task-manager-plugin/server';
import type { ServiceIdentifier } from 'inversify';

export const EsServiceInternalToken = Symbol.for(
  'alerting_v2.EsServiceInternal'
) as ServiceIdentifier<ElasticsearchClient>;

/**
 * Elasticsearch clients built by Task Manager for a task execution, scoped to the task's API key.
 * Bound (as a `Global`) into the per-task DI scope by the task runner factory when the run context
 * carries them. When present, the request-scoped ES tokens below resolve from these clients instead
 * of building their own via `elasticsearch.client.asScoped(request)`. Unbound outside task
 * execution (e.g. HTTP routes), where the ES tokens fall back to the request-based clients.
 */
export const TaskManagerEsClientsToken = Symbol.for(
  'alerting_v2.TaskManagerEsClients'
) as ServiceIdentifier<TaskScopedClusterClients>;

export const EsServiceScopedToken = Symbol.for(
  'alerting_v2.EsServiceScoped'
) as ServiceIdentifier<ElasticsearchClient>;

/**
 * Request-scoped current-user client with `projectRouting: 'space'`:
 * `elasticsearch.client.asScoped(request, { projectRouting: 'space' }).asCurrentUser`.
 * Used for rule-execution queries against user data so they are scoped to the originating
 * space/project when CPS is enabled (falls back to local routing when CPS is disabled).
 */
export const EsServiceScopedSpaceRoutingToken = Symbol.for(
  'alerting_v2.EsServiceScopedSpaceRouting'
) as ServiceIdentifier<ElasticsearchClient>;
