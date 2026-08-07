/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MemoryWorkflowStatus, MemoryWorkflowType } from '@kbn/agent-memory-common';
import type { KibanaRequest } from '@kbn/core/server';
import type { MemoryWorkflowsService } from '../workflows/workflows_service';
import { getMemoryStatus } from './status';

const request = {} as KibanaRequest;

const workflow = (
  type: MemoryWorkflowType,
  overrides: Partial<MemoryWorkflowStatus> = {}
): MemoryWorkflowStatus => ({ type, installed: true, enabled: true, ...overrides });

const allWorkflows = (overrides: Partial<MemoryWorkflowStatus> = {}) => [
  workflow('consolidation', overrides),
  workflow('conversation_scraper', overrides),
  workflow('gap_detection', overrides),
];

const createWorkflowsService = ({
  available = true,
  workflows = allWorkflows(),
}: {
  available?: boolean;
  workflows?: MemoryWorkflowStatus[];
} = {}): MemoryWorkflowsService => ({
  isAvailable: () => available,
  listStatuses: async () => workflows,
  setEnabled: async () => [],
  run: async () => 'execution-id',
});

const getState = async ({
  enabled = true,
  storageInstalled = true,
  workflowsService = createWorkflowsService(),
}: {
  enabled?: boolean;
  storageInstalled?: boolean;
  workflowsService?: MemoryWorkflowsService;
} = {}) =>
  getMemoryStatus({
    request,
    isMemoryEnabled: () => enabled,
    isStorageInstalled: () => storageInstalled,
    workflowsService,
    resolveCanManage: async () => true,
  });

describe('getMemoryStatus', () => {
  it('reports unavailable when the plugin is disabled', async () => {
    const status = await getState({ enabled: false });

    expect(status.state).toBe('unavailable');
    expect(status.reason).toBe('plugin_disabled');
    expect(status.capabilities.canManage).toBe(false);
  });

  it('reports not_installed when nothing exists yet', async () => {
    const status = await getState({
      storageInstalled: false,
      workflowsService: createWorkflowsService({
        workflows: allWorkflows({ installed: false, enabled: false }),
      }),
    });

    expect(status.state).toBe('not_installed');
  });

  it('reports installing only while an install is genuinely partway through', async () => {
    const status = await getState({
      storageInstalled: false,
      workflowsService: createWorkflowsService({
        workflows: [
          workflow('consolidation'),
          workflow('conversation_scraper', { installed: false, enabled: false }),
          workflow('gap_detection', { installed: false, enabled: false }),
        ],
      }),
    });

    expect(status.state).toBe('installing');
  });

  /**
   * The regression this file exists for: a curation workflow that never installs
   * used to pin the UI to a spinner forever, with no explanation and no way out.
   * Storage is what makes memory usable, so this is `partially_ready`.
   */
  it('stays usable when storage exists but a curation workflow never installed', async () => {
    const status = await getState({
      workflowsService: createWorkflowsService({
        workflows: [
          workflow('consolidation'),
          workflow('conversation_scraper'),
          workflow('gap_detection', { installed: false, enabled: false }),
        ],
      }),
    });

    expect(status.state).toBe('partially_ready');
  });

  it('reports partially_ready when jobs are installed but switched off', async () => {
    const status = await getState({
      workflowsService: createWorkflowsService({ workflows: allWorkflows({ enabled: false }) }),
    });

    expect(status.state).toBe('partially_ready');
    expect(status.maintenance.enabled).toBe(false);
  });

  it('reports ready when storage and every job are in place', async () => {
    const status = await getState();

    expect(status.state).toBe('ready');
    expect(status.maintenance.enabled).toBe(true);
  });

  it('treats storage alone as ready when workflows are unavailable', async () => {
    const status = await getState({
      workflowsService: createWorkflowsService({ available: false, workflows: [] }),
    });

    expect(status.state).toBe('ready');
    expect(status.reason).toBe('workflows_unavailable');
  });
});
