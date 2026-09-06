/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import { appContextService } from '../app_context';
import { updateWorkflowAssets } from './update_workflow_assets';

const mockLogger = {
  warn: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  trace: jest.fn(),
  fatal: jest.fn(),
  log: jest.fn(),
  isLevelEnabled: jest.fn(),
  get: jest.fn().mockReturnValue({
    warn: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    trace: jest.fn(),
    fatal: jest.fn(),
    log: jest.fn(),
    isLevelEnabled: jest.fn(),
    get: jest.fn(),
  }),
} as any;

describe('updateWorkflowAssets', () => {
  const createSoClient = () => {
    const soClient = savedObjectsClientMock.create();
    soClient.getCurrentNamespace.mockReturnValue('default');
    return soClient;
  };

  const createManagementApi = (overrides: any = {}) => ({
    getWorkflow: jest.fn(),
    updateWorkflow: jest.fn(),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('replaces stale connector ids in installed workflow assets', async () => {
    const soClient = createSoClient();
    const updateWorkflow = jest.fn();
    const getWorkflow = jest.fn().mockResolvedValue({ id: 'existing' });

    jest.spyOn(appContextService, 'getWorkflowsManagementSetup').mockReturnValue({
      management: createManagementApi({ getWorkflow, updateWorkflow }),
    } as any);

    const assetsMap = new Map([
      [
        'sdlc_intel-1.0.0/kibana/workflow/sync_issues.yaml',
        Buffer.from(`
consts:
  githubConnectorId: REPLACE_WITH_GITHUB_CONNECTOR_ID
`),
      ],
    ]);

    await updateWorkflowAssets({
      savedObjectsClient: soClient,
      packageInfo: { name: 'sdlc_intel', version: '1.0.0' } as any,
      assetsMap,
      vars: { github_connector_id: 'new-github-conn' },
      request: httpServerMock.createKibanaRequest(),
      logger: mockLogger,
    });

    expect(updateWorkflow).toHaveBeenCalledTimes(1);
    const [id, partial, spaceId] = updateWorkflow.mock.calls[0];
    expect(id).toBe('fleet-default-sdlc-intel-sync_issues');
    expect(spaceId).toBe('default');
    expect(partial.yaml).toContain('githubConnectorId: new-github-conn');
    expect(partial.yaml).not.toContain('REPLACE_WITH_GITHUB_CONNECTOR_ID');
  });

  it('silently skips when the workflow does not exist (install owns creation)', async () => {
    const soClient = createSoClient();
    const updateWorkflow = jest.fn();
    const getWorkflow = jest.fn().mockResolvedValue(null);

    jest.spyOn(appContextService, 'getWorkflowsManagementSetup').mockReturnValue({
      management: createManagementApi({ getWorkflow, updateWorkflow }),
    } as any);

    const assetsMap = new Map([
      [
        'sdlc_intel-1.0.0/kibana/workflow/sync_issues.yaml',
        Buffer.from(`
consts:
  githubConnectorId: REPLACE_WITH_GITHUB_CONNECTOR_ID
`),
      ],
    ]);

    await updateWorkflowAssets({
      savedObjectsClient: soClient,
      packageInfo: { name: 'sdlc_intel', version: '1.0.0' } as any,
      assetsMap,
      vars: { github_connector_id: 'new-github-conn' },
      request: httpServerMock.createKibanaRequest(),
      logger: mockLogger,
    });

    expect(updateWorkflow).not.toHaveBeenCalled();
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('workflow does not exist')
    );
  });

  it('silently skips when workflowsManagement is unavailable', async () => {
    const soClient = createSoClient();
    jest.spyOn(appContextService, 'getWorkflowsManagementSetup').mockReturnValue(undefined);

    await updateWorkflowAssets({
      savedObjectsClient: soClient,
      packageInfo: { name: 'sdlc_intel', version: '1.0.0' } as any,
      assetsMap: new Map(),
      vars: {},
      request: httpServerMock.createKibanaRequest(),
      logger: mockLogger,
    });

    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('workflowsManagement unavailable')
    );
  });

  it('substitutes fleet agent placeholders with workflow ids', async () => {
    const soClient = createSoClient();
    const updateWorkflow = jest.fn();
    const getWorkflow = jest.fn().mockResolvedValue({ id: 'existing' });

    jest.spyOn(appContextService, 'getWorkflowsManagementSetup').mockReturnValue({
      management: createManagementApi({ getWorkflow, updateWorkflow }),
    } as any);

    const assetsMap = new Map([
      [
        'sdlc_intel-1.0.0/kibana/workflow/parent.yaml',
        Buffer.from(`
steps:
  - agent: REPLACE_WITH_FLEET_AGENT_CHILD
`),
      ],
      [
        'sdlc_intel-1.0.0/kibana/workflow/child.yaml',
        Buffer.from(`
consts:
  value: child-workflow
`),
      ],
    ]);

    await updateWorkflowAssets({
      savedObjectsClient: soClient,
      packageInfo: { name: 'sdlc_intel', version: '1.0.0' } as any,
      assetsMap,
      vars: {},
      request: httpServerMock.createKibanaRequest(),
      logger: mockLogger,
    });

    expect(updateWorkflow).toHaveBeenCalledTimes(2);
    const parentCall = updateWorkflow.mock.calls.find(
      ([id]) => id === 'fleet-default-sdlc-intel-parent'
    );
    expect(parentCall).toBeDefined();
    expect(parentCall[1].yaml).toContain('agent: fleet-default-sdlc-intel-CHILD');
  });
});
