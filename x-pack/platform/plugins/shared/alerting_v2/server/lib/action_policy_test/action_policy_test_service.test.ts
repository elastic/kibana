/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { WorkflowDetailDto } from '@kbn/workflows';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { ActionPolicyClient } from '../action_policy_client';
import { ALERTING_ERROR_CODES } from '../errors/error_codes';
import { MOCK_KIBANA_BASE_URL } from '../dispatcher/fixtures/test_utils';
import { createMockEbtService } from '../services/ebt_service/ebt_service.mock';
import { createMockLicenseService } from '../services/license_service/license_service.mock';
import { createLoggerService } from '../services/logger_service/logger_service.mock';
import type { PrivilegeChecker } from '../services/privilege_checker/privilege_checker';
import { ACTION_POLICY_TEST_SENT_EBT_EVENT_TYPE } from '../telemetry/action_policy_test_ebt_event';
import { ActionPolicyTestService } from './action_policy_test_service';

const SPACE_ID = 'team-a';

const createPolicy = (overrides: Partial<ActionPolicyResponse> = {}): ActionPolicyResponse => ({
  id: 'policy-1',
  name: 'Policy',
  description: '',
  enabled: true,
  destinations: [
    { type: 'workflow', id: 'workflow-1' },
    { type: 'workflow', id: 'workflow-2' },
  ],
  grouping: { mode: 'per_alert' },
  created_by: { profile_uid: 'elastic' },
  created_at: '2026-01-01T00:00:00.000Z',
  updated_by: { profile_uid: 'elastic' },
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const createWorkflow = (overrides: Partial<WorkflowDetailDto> = {}): WorkflowDetailDto => ({
  id: 'workflow-1',
  name: 'Workflow 1',
  enabled: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  createdBy: 'elastic',
  lastUpdatedAt: '2026-01-01T00:00:00.000Z',
  lastUpdatedBy: 'elastic',
  definition: null,
  yaml: '',
  valid: true,
  permissions: { read: true, execute: true, edit: true, manage: true },
  ...overrides,
});

const setup = ({
  policy = createPolicy(),
  workflowPrivileges = { read: true, execute: true },
}: {
  policy?: ActionPolicyResponse;
  workflowPrivileges?: { read: boolean; execute: boolean };
} = {}) => {
  const request = httpServerMock.createKibanaRequest();
  const actionPolicyClient = { getActionPolicy: jest.fn().mockResolvedValue(policy) };
  const workflowsManagement = {
    testWorkflow: jest.fn(),
    getWorkflowsByIds: jest.fn().mockResolvedValue([]),
    bulkScheduleWorkflow: jest.fn(),
  };
  const licenseService = createMockLicenseService();
  const ebtService = createMockEbtService();
  const privilegeChecker = {
    getWorkflowPrivileges: jest.fn().mockResolvedValue(workflowPrivileges),
  };
  const { loggerService } = createLoggerService();

  const service = new ActionPolicyTestService(
    actionPolicyClient as unknown as ActionPolicyClient,
    workflowsManagement as unknown as WorkflowsServerPluginSetup['management'],
    licenseService,
    ebtService,
    privilegeChecker as unknown as PrivilegeChecker,
    MOCK_KIBANA_BASE_URL,
    SPACE_ID,
    request,
    loggerService
  );

  return {
    service,
    request,
    actionPolicyClient,
    workflowsManagement,
    licenseService,
    ebtService,
  };
};

describe('ActionPolicyTestService', () => {
  describe('preview', () => {
    it('returns the synthetic group of the policy, built in the policy space', async () => {
      const { service } = setup();

      const result = await service.preview({ policyId: 'policy-1', seed: 5 });

      expect(result.seed).toBe(5);
      expect(result.groups).toHaveLength(1);
      const [payload] = result.groups;
      expect(payload).toEqual(expect.objectContaining({ policyId: 'policy-1' }));
      expect(payload.alerts).toEqual([
        expect.objectContaining({ space_id: SPACE_ID, alert_status: 'active', source: 'internal' }),
      ]);
    });

    it('is deterministic for a seed and picks a seed when none is given', async () => {
      const { service } = setup();

      const first = await service.preview({ policyId: 'policy-1', seed: 5 });
      const second = await service.preview({ policyId: 'policy-1', seed: 5 });
      const generated = await service.preview({ policyId: 'policy-1' });

      expect(first.groups[0].id).toBe(second.groups[0].id);
      expect(Number.isInteger(generated.seed)).toBe(true);
    });

    it('describes the destinations the user can run', async () => {
      const { service, workflowsManagement, request } = setup();
      workflowsManagement.getWorkflowsByIds.mockResolvedValue([
        createWorkflow({ id: 'workflow-1', name: 'Slack', enabled: false }),
        createWorkflow({
          id: 'workflow-2',
          name: 'Email',
          permissions: { read: true, execute: false, edit: false, manage: false },
        }),
      ]);

      const { destinations } = await service.preview({ policyId: 'policy-1' });

      expect(workflowsManagement.getWorkflowsByIds).toHaveBeenCalledWith(
        ['workflow-1', 'workflow-2'],
        SPACE_ID,
        request
      );
      expect(destinations).toEqual([
        { id: 'workflow-1', name: 'Slack', enabled: false, executable: true },
        { id: 'workflow-2', name: 'Email', enabled: true, executable: false },
      ]);
    });

    it('reports destinations as executable without reading them when the user can only run workflows', async () => {
      const { service, workflowsManagement } = setup({
        workflowPrivileges: { read: false, execute: true },
      });

      const { destinations } = await service.preview({ policyId: 'policy-1' });

      expect(workflowsManagement.getWorkflowsByIds).not.toHaveBeenCalled();
      expect(destinations).toEqual([
        { id: 'workflow-1', executable: true },
        { id: 'workflow-2', executable: true },
      ]);
    });

    it('reports readable destinations as not executable when the user cannot run workflows', async () => {
      const { service, workflowsManagement } = setup({
        workflowPrivileges: { read: true, execute: false },
      });
      workflowsManagement.getWorkflowsByIds.mockResolvedValue([createWorkflow()]);

      const { destinations } = await service.preview({ policyId: 'policy-1' });

      expect(destinations[0]).toEqual({
        id: 'workflow-1',
        name: 'Workflow 1',
        enabled: true,
        executable: false,
      });
    });

    it('reports a destination the user cannot read as not executable', async () => {
      const { service, workflowsManagement } = setup();
      workflowsManagement.getWorkflowsByIds.mockResolvedValue([createWorkflow()]);

      const { destinations } = await service.preview({ policyId: 'policy-1' });

      expect(destinations[1]).toEqual({ id: 'workflow-2', executable: false });
    });

    it('rejects when the license does not support action policies', async () => {
      const { service, licenseService, actionPolicyClient } = setup();
      licenseService.assertActionPoliciesLicense.mockRejectedValue(Boom.forbidden('license'));

      await expect(service.preview({ policyId: 'policy-1' })).rejects.toThrow('license');
      expect(actionPolicyClient.getActionPolicy).not.toHaveBeenCalled();
    });
  });

  describe('send', () => {
    it('runs one workflow test run per selected destination as the current user, in the policy space', async () => {
      const { service, workflowsManagement, request } = setup();
      workflowsManagement.testWorkflow
        .mockResolvedValueOnce('execution-1')
        .mockResolvedValueOnce('execution-2');

      const result = await service.send({
        policyId: 'policy-1',
        seed: 5,
        destinationIds: ['workflow-1', 'workflow-2'],
      });

      const preview = await service.preview({ policyId: 'policy-1', seed: 5 });
      const [previewPayload] = preview.groups;

      // The payload sent is the previewed one; only `last_event_timestamp` is rebuilt as now.
      const { alerts: previewAlerts, ...previewGroup } = previewPayload;
      expect(workflowsManagement.testWorkflow).toHaveBeenCalledTimes(2);
      for (const workflowId of ['workflow-1', 'workflow-2']) {
        expect(workflowsManagement.testWorkflow).toHaveBeenCalledWith({
          workflowId,
          inputs: { payload: expect.objectContaining(previewGroup) },
          spaceId: SPACE_ID,
          request,
        });
      }
      const [[{ inputs }]] = workflowsManagement.testWorkflow.mock.calls;
      expect(inputs.payload.alerts).toEqual(
        (previewAlerts as Array<Record<string, unknown>>).map((alert) => ({
          ...alert,
          last_event_timestamp: expect.any(String),
        }))
      );
      expect(result).toEqual({
        results: [
          { workflow_id: 'workflow-1', workflow_execution_id: 'execution-1' },
          { workflow_id: 'workflow-2', workflow_execution_id: 'execution-2' },
        ],
      });
      expect(workflowsManagement.bulkScheduleWorkflow).not.toHaveBeenCalled();
    });

    it('only runs the selected destinations, once each', async () => {
      const { service, workflowsManagement } = setup();
      workflowsManagement.testWorkflow.mockResolvedValue('execution-2');

      await service.send({
        policyId: 'policy-1',
        seed: 5,
        destinationIds: ['workflow-2', 'workflow-2'],
      });

      expect(workflowsManagement.testWorkflow).toHaveBeenCalledTimes(1);
      expect(workflowsManagement.testWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({ workflowId: 'workflow-2' })
      );
    });

    it('maps a destination that fails to start to its error, and still runs the others', async () => {
      const { service, workflowsManagement } = setup();
      workflowsManagement.testWorkflow
        .mockRejectedValueOnce(new Error('Insufficient permissions to execute workflow'))
        .mockResolvedValueOnce('execution-2');

      const result = await service.send({
        policyId: 'policy-1',
        seed: 5,
        destinationIds: ['workflow-1', 'workflow-2'],
      });

      expect(result.results).toEqual([
        { workflow_id: 'workflow-1', error: 'Insufficient permissions to execute workflow' },
        { workflow_id: 'workflow-2', workflow_execution_id: 'execution-2' },
      ]);
    });

    it('rejects destination ids that do not belong to the policy before running anything', async () => {
      const { service, workflowsManagement } = setup();

      const error = await service
        .send({ policyId: 'policy-1', seed: 5, destinationIds: ['workflow-1', 'other'] })
        .catch((e) => e);

      expect(Boom.isBoom(error)).toBe(true);
      expect(error.output.statusCode).toBe(400);
      expect(error.data).toEqual({
        code: ALERTING_ERROR_CODES.ACTION_POLICY_TEST_INVALID_DESTINATIONS,
        details: { action_policy_id: 'policy-1', destination_ids: ['other'] },
      });
      expect(workflowsManagement.testWorkflow).not.toHaveBeenCalled();
    });

    it('sends a policy whose matcher has a KQL expression', async () => {
      const { service, workflowsManagement } = setup({
        policy: createPolicy({ matcher: { tags: ['prod'], expression: 'severity: critical' } }),
      });
      workflowsManagement.testWorkflow.mockResolvedValue('execution-1');

      await service.send({ policyId: 'policy-1', seed: 5, destinationIds: ['workflow-1'] });

      expect(workflowsManagement.testWorkflow).toHaveBeenCalledTimes(1);
    });

    it('rejects when the license does not support action policies', async () => {
      const { service, licenseService, workflowsManagement } = setup();
      licenseService.assertActionPoliciesLicense.mockRejectedValue(Boom.forbidden('license'));

      await expect(
        service.send({ policyId: 'policy-1', seed: 5, destinationIds: ['workflow-1'] })
      ).rejects.toThrow('license');
      expect(workflowsManagement.testWorkflow).not.toHaveBeenCalled();
    });

    it('reports one telemetry event per send', async () => {
      const { service, workflowsManagement, ebtService } = setup();
      workflowsManagement.testWorkflow
        .mockResolvedValueOnce('execution-1')
        .mockRejectedValueOnce(new Error('boom'));

      await service.send({
        policyId: 'policy-1',
        seed: 5,
        destinationIds: ['workflow-1', 'workflow-2'],
      });

      expect(ebtService.reportEvent).toHaveBeenCalledTimes(1);
      expect(ebtService.reportEvent).toHaveBeenCalledWith(ACTION_POLICY_TEST_SENT_EBT_EVENT_TYPE, {
        action_policy_id: 'policy-1',
        space_id: SPACE_ID,
        grouping_mode: 'per_alert',
        matcher_type: 'none',
        alert_count: 1,
        destination_count: 2,
        failed_count: 1,
      });
    });
  });
});
