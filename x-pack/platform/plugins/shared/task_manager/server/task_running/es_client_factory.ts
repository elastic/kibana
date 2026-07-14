/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IClusterClient, KibanaRequest } from '@kbn/core/server';
import type { TaskScopedClusterClients } from '../task';

interface BuildTaskEsClientsOpts {
  clusterClient: IClusterClient;
  fakeRequest?: KibanaRequest;
}

/**
 * Builds the Elasticsearch clients handed to a task runner via the run context. The clients are
 * scoped to the task's API key through its `fakeRequest`, so task runners can query Elasticsearch
 * as the originating user without having to call `elasticsearch.client.asScoped(fakeRequest)`
 * themselves.
 *
 * Returns `undefined` when there is no `fakeRequest` (i.e. the task was scheduled without an API
 * key), matching the condition under which `fakeRequest` is populated on the run context.
 *
 * `asScoped` is cheap: the underlying per-user child clients are created lazily on first access of
 * `asCurrentUser` / `asInternalUser`, so tasks that never touch Elasticsearch pay nothing.
 */
export const buildTaskEsClients = ({
  clusterClient,
  fakeRequest,
}: BuildTaskEsClientsOpts): TaskScopedClusterClients | undefined => {
  if (!fakeRequest) return;

  return {
    scoped: clusterClient.asScoped(fakeRequest),
    // `projectRouting: 'space'` scopes rule-execution queries to the originating space/project
    // when CPS is enabled, matching alerting behavior. Falls back to local routing otherwise.
    scopedWithSpaceRouting: clusterClient.asScoped(fakeRequest, { projectRouting: 'space' }),
  };
};
