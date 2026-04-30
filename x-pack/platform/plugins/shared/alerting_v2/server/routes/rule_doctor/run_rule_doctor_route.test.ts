/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { savedObjectsServiceMock } from '@kbn/core-saved-objects-server-mocks';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { RULE_DOCTOR_DEDUP_WORKFLOW_ID } from '../../workflows/load_workflows';
import { createRouteDependencies } from '../test_utils';
import { RunRuleDoctorRoute } from './run_rule_doctor_route';
import type { SpaceContext } from '../rule_doctor_insights/space_context';

describe('RunRuleDoctorRoute', () => {
  const workflowsManagement = {
    scheduleWorkflow: jest.fn(),
    getWorkflow: jest.fn(),
    createWorkflow: jest.fn(),
    updateWorkflow: jest.fn(),
  } as unknown as jest.Mocked<WorkflowsServerPluginSetup['management']>;

  const spaceContext: SpaceContext = { spaceId: 'default' };
  const logger = loggingSystemMock.createLogger();
  const uiSettings = uiSettingsServiceMock.createStartContract();
  const savedObjects = savedObjectsServiceMock.createStartContract();

  const mockUiSettingsClient = uiSettingsServiceMock.createClient();
  mockUiSettingsClient.get.mockResolvedValue('mock-connector-id');
  uiSettings.asScopedToClient.mockReturnValue(mockUiSettingsClient);

  const persistedWorkflow = {
    id: RULE_DOCTOR_DEDUP_WORKFLOW_ID,
    name: 'rule_doctor_deduplication',
    enabled: true,
    definition: null,
    yaml: 'version: "1"\nname: rule_doctor_deduplication',
    valid: true,
    createdAt: '2026-01-01T00:00:00Z',
    createdBy: 'system',
    lastUpdatedAt: '2026-01-01T00:00:00Z',
    lastUpdatedBy: 'system',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUiSettingsClient.get.mockResolvedValue('mock-connector-id');
    uiSettings.asScopedToClient.mockReturnValue(mockUiSettingsClient);
  });

  it('schedules existing workflow and returns 202', async () => {
    const { ctx, response } = createRouteDependencies();
    const request = httpServerMock.createKibanaRequest({
      body: { type: 'deduplication' },
    });

    (workflowsManagement.getWorkflow as jest.Mock).mockResolvedValue(persistedWorkflow);
    (workflowsManagement.scheduleWorkflow as jest.Mock).mockResolvedValueOnce('wf-exec-123');

    const route = new RunRuleDoctorRoute(
      ctx,
      request,
      workflowsManagement,
      spaceContext,
      uiSettings,
      savedObjects,
      logger
    );
    await route.handle();

    expect(workflowsManagement.getWorkflow).toHaveBeenCalledWith(
      RULE_DOCTOR_DEDUP_WORKFLOW_ID,
      'default'
    );
    expect(workflowsManagement.scheduleWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        id: RULE_DOCTOR_DEDUP_WORKFLOW_ID,
        enabled: true,
      }),
      'default',
      expect.objectContaining({
        space_id: 'default',
        execution_id: expect.any(String),
        connector_id: 'mock-connector-id',
      }),
      request,
      'rule_doctor'
    );
    expect(response.accepted).toHaveBeenCalledWith({
      body: expect.objectContaining({
        execution_id: expect.any(String),
        type: 'deduplication',
      }),
    });
  });

  it('creates workflow on first run when not yet persisted', async () => {
    const { ctx, response } = createRouteDependencies();
    const request = httpServerMock.createKibanaRequest({
      body: { type: 'deduplication' },
    });

    (workflowsManagement.getWorkflow as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(persistedWorkflow);
    (workflowsManagement.scheduleWorkflow as jest.Mock).mockResolvedValueOnce('wf-exec-456');

    const route = new RunRuleDoctorRoute(
      ctx,
      request,
      workflowsManagement,
      spaceContext,
      uiSettings,
      savedObjects,
      logger
    );
    await route.handle();

    expect(workflowsManagement.createWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        id: RULE_DOCTOR_DEDUP_WORKFLOW_ID,
        yaml: expect.any(String),
      }),
      'default',
      request
    );
    expect(workflowsManagement.updateWorkflow).toHaveBeenCalledWith(
      RULE_DOCTOR_DEDUP_WORKFLOW_ID,
      expect.objectContaining({ enabled: true }),
      'default',
      request
    );
    expect(response.accepted).toHaveBeenCalled();
  });

  it('returns an error when scheduleWorkflow fails', async () => {
    const { ctx, response } = createRouteDependencies();
    const request = httpServerMock.createKibanaRequest({
      body: { type: 'deduplication' },
    });

    (workflowsManagement.getWorkflow as jest.Mock).mockResolvedValue(persistedWorkflow);
    (workflowsManagement.scheduleWorkflow as jest.Mock).mockRejectedValueOnce(
      new Error('workflow engine unavailable')
    );

    const route = new RunRuleDoctorRoute(
      ctx,
      request,
      workflowsManagement,
      spaceContext,
      uiSettings,
      savedObjects,
      logger
    );
    await route.handle();

    expect(response.customError).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500 })
    );
  });
});
