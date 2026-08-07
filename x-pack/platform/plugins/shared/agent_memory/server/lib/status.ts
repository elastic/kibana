/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AGENT_MEMORY_FEATURE_ID,
  uiPrivileges,
  type MemoryState,
  type MemoryStatusResponse,
  type MemoryWorkflowStatus,
} from '@kbn/agent-memory-common';
import type { KibanaRequest } from '@kbn/core/server';
import type { MemoryWorkflowsService } from '../workflows/workflows_service';
import { MEMORIES_DATA_STREAM, MEMORY_HISTORY_DATA_STREAM } from './memory';

/**
 * Derives the single lifecycle state the UI switches on.
 *
 * Kept server-side deliberately: the browser should not have to reimplement
 * "installed but not enabled yet" versus "still installing".
 */
const deriveState = ({
  storageInstalled,
  workflows,
  workflowsAvailable,
}: {
  storageInstalled: boolean;
  workflows: MemoryWorkflowStatus[];
  workflowsAvailable: boolean;
}): MemoryState => {
  if (!storageInstalled) {
    // Storage is what makes memory usable at all, and it is created at start or by
    // setup. Nothing installed yet means "not set up"; partially installed means an
    // install is genuinely in flight.
    return workflows.some((workflow) => workflow.installed) ? 'installing' : 'not_installed';
  }

  // Storage exists, so agents can read and write. Anything missing beyond this point
  // only costs automatic curation.
  //
  // `installing` is deliberately NOT used here: a curation workflow that failed to
  // install would otherwise pin the UI to a spinner forever, with no explanation and
  // nothing the user can do. `partially_ready` shows the browser plus a callout.
  if (!workflowsAvailable) {
    return 'ready';
  }
  const allReady =
    workflows.length > 0 && workflows.every((workflow) => workflow.installed && workflow.enabled);
  return allReady ? 'ready' : 'partially_ready';
};

export type ResolveCanManage = (request: KibanaRequest) => Promise<boolean>;

/**
 * Whether this user may change memory, resolved from the Kibana feature's UI
 * privileges. Answered by the server so the UI cannot disagree with what the
 * write routes will actually allow.
 */
export const createResolveCanManage =
  (resolveCapabilities: (request: KibanaRequest) => Promise<Record<string, unknown>>) =>
  async (request: KibanaRequest): Promise<boolean> => {
    const capabilities = await resolveCapabilities(request);
    const memoryCapabilities = capabilities[AGENT_MEMORY_FEATURE_ID] as
      | Record<string, boolean>
      | undefined;
    return memoryCapabilities?.[uiPrivileges.manage] === true;
  };

export const getMemoryStatus = async ({
  request,
  isMemoryEnabled,
  isStorageInstalled,
  workflowsService,
  resolveCanManage,
}: {
  request: KibanaRequest;
  isMemoryEnabled: () => boolean;
  isStorageInstalled: () => boolean;
  workflowsService: MemoryWorkflowsService;
  resolveCanManage: ResolveCanManage;
}): Promise<MemoryStatusResponse> => {
  const storageInstalled = isStorageInstalled();
  const dataStreams = [
    { name: MEMORIES_DATA_STREAM, installed: storageInstalled },
    { name: MEMORY_HISTORY_DATA_STREAM, installed: storageInstalled },
  ];

  if (!isMemoryEnabled()) {
    return {
      state: 'unavailable',
      reason: 'plugin_disabled',
      storage: { installed: false, dataStreams },
      maintenance: { enabled: false, workflows: [] },
      capabilities: { canManage: false },
    };
  }

  const [workflows, canManage] = await Promise.all([
    workflowsService.listStatuses(),
    resolveCanManage(request),
  ]);

  const workflowsAvailable = workflowsService.isAvailable();

  return {
    state: deriveState({ storageInstalled, workflows, workflowsAvailable }),
    ...(workflowsAvailable ? {} : { reason: 'workflows_unavailable' as const }),
    storage: { installed: storageInstalled, dataStreams },
    maintenance: {
      enabled: workflows.length > 0 && workflows.every((workflow) => workflow.enabled),
      workflows,
    },
    capabilities: { canManage },
  };
};
