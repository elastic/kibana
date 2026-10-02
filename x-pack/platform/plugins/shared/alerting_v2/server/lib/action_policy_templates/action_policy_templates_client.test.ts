/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { ActionPolicyClient } from '../action_policy_client';
import { ALERTING_ERROR_CODES } from '../errors/error_codes';
import type { LicenseServiceContract } from '../services/license_service/license_service';
import { ActionPolicyTemplatesClient } from './action_policy_templates_client';
import { getTemplateActionPolicyId, getTemplateWorkflowId } from './ids';
import { ACTION_POLICY_TEMPLATES } from './templates';

type WorkflowsManagementApi = ConstructorParameters<typeof ActionPolicyTemplatesClient>[3];

const SPACE_ID = 'my-space';
const WORKFLOW_ID = getTemplateWorkflowId(SPACE_ID);
const POLICY_IDS = ACTION_POLICY_TEMPLATES.map(({ key }) =>
  getTemplateActionPolicyId(SPACE_ID, key)
);

class WorkflowConflictError extends Error {
  public readonly statusCode = 409;
}

describe('ActionPolicyTemplatesClient', () => {
  const request = httpServerMock.createKibanaRequest();

  let actionPolicyClient: jest.Mocked<
    Pick<ActionPolicyClient, 'actionPolicyExists' | 'createActionPolicy'>
  >;
  let workflowsManagement: {
    isWorkflowsAvailable: boolean;
    getWorkflowsByIds: jest.Mock;
    createWorkflow: jest.Mock;
  };
  let licenseService: jest.Mocked<Pick<LicenseServiceContract, 'assertActionPoliciesLicense'>>;
  let client: ActionPolicyTemplatesClient;

  beforeEach(() => {
    actionPolicyClient = {
      actionPolicyExists: jest.fn().mockResolvedValue(false),
      createActionPolicy: jest.fn().mockResolvedValue({}),
    };
    workflowsManagement = {
      isWorkflowsAvailable: true,
      getWorkflowsByIds: jest.fn().mockResolvedValue([]),
      createWorkflow: jest.fn().mockImplementation(async ({ id }: { id?: string }) => ({
        id: id ?? 'generated-workflow-id',
      })),
    };
    licenseService = { assertActionPoliciesLicense: jest.fn().mockResolvedValue(undefined) };

    client = new ActionPolicyTemplatesClient(
      request,
      SPACE_ID,
      actionPolicyClient as unknown as ActionPolicyClient,
      workflowsManagement as unknown as WorkflowsManagementApi,
      licenseService as unknown as LicenseServiceContract
    );
  });

  it('rejects when the license check fails, before touching any resource', async () => {
    const licenseError = Boom.forbidden('license');
    licenseService.assertActionPoliciesLicense.mockRejectedValue(licenseError);

    await expect(client.installTemplates()).rejects.toBe(licenseError);

    expect(workflowsManagement.createWorkflow).not.toHaveBeenCalled();
    expect(actionPolicyClient.createActionPolicy).not.toHaveBeenCalled();
  });

  it('rejects with a forbidden error when Workflows is not available', async () => {
    workflowsManagement.isWorkflowsAvailable = false;

    await expect(client.installTemplates()).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 403 },
      data: { code: ALERTING_ERROR_CODES.ACTION_POLICY_TEMPLATES_WORKFLOWS_UNAVAILABLE },
    });

    expect(workflowsManagement.createWorkflow).not.toHaveBeenCalled();
    expect(actionPolicyClient.createActionPolicy).not.toHaveBeenCalled();
  });

  describe('on a first install', () => {
    it('creates the workflow with the deterministic id in the request space', async () => {
      await client.installTemplates();

      expect(workflowsManagement.createWorkflow).toHaveBeenCalledTimes(1);
      expect(workflowsManagement.createWorkflow).toHaveBeenCalledWith(
        { id: WORKFLOW_ID, yaml: expect.stringContaining('type: console') },
        SPACE_ID,
        request
      );
    });

    it('creates every template as a disabled policy dispatching to the workflow', async () => {
      await client.installTemplates();

      expect(actionPolicyClient.createActionPolicy).toHaveBeenCalledTimes(
        ACTION_POLICY_TEMPLATES.length
      );
      ACTION_POLICY_TEMPLATES.forEach(({ data }, index) => {
        expect(actionPolicyClient.createActionPolicy).toHaveBeenCalledWith({
          data: { ...data, destinations: [{ type: 'workflow', id: WORKFLOW_ID }] },
          options: { id: POLICY_IDS[index], enabled: false },
        });
      });
    });

    it('reports everything as created', async () => {
      await expect(client.installTemplates()).resolves.toEqual({
        workflow: { id: WORKFLOW_ID, status: 'created' },
        policies: ACTION_POLICY_TEMPLATES.map(({ data }, index) => ({
          id: POLICY_IDS[index],
          name: data.name,
          status: 'created',
        })),
      });
    });
  });

  describe('on a repeated install', () => {
    beforeEach(() => {
      actionPolicyClient.actionPolicyExists.mockResolvedValue(true);
      workflowsManagement.getWorkflowsByIds.mockResolvedValue([{ id: WORKFLOW_ID }]);
    });

    it('does not create anything and reports everything as skipped', async () => {
      const result = await client.installTemplates();

      expect(workflowsManagement.createWorkflow).not.toHaveBeenCalled();
      expect(actionPolicyClient.createActionPolicy).not.toHaveBeenCalled();
      expect(result.workflow.status).toBe('skipped');
      expect(result.policies.map(({ status }) => status)).toEqual(
        ACTION_POLICY_TEMPLATES.map(() => 'skipped')
      );
    });

    it('does not create the workflow when no policy needs it, even if it was deleted', async () => {
      workflowsManagement.getWorkflowsByIds.mockResolvedValue([]);

      const result = await client.installTemplates();

      expect(workflowsManagement.createWorkflow).not.toHaveBeenCalled();
      expect(result.workflow).toEqual({ id: WORKFLOW_ID, status: 'skipped' });
    });
  });

  describe('when some templates were deleted', () => {
    it('recreates only the missing policies and reuses the existing workflow', async () => {
      actionPolicyClient.actionPolicyExists.mockImplementation(
        async ({ id }) => id !== POLICY_IDS[1]
      );
      workflowsManagement.getWorkflowsByIds.mockResolvedValue([{ id: WORKFLOW_ID }]);

      const result = await client.installTemplates();

      expect(workflowsManagement.createWorkflow).not.toHaveBeenCalled();
      expect(actionPolicyClient.createActionPolicy).toHaveBeenCalledTimes(1);
      expect(actionPolicyClient.createActionPolicy).toHaveBeenCalledWith(
        expect.objectContaining({ options: { id: POLICY_IDS[1], enabled: false } })
      );
      expect(result.policies.map(({ status }) => status)).toEqual([
        'skipped',
        'created',
        'skipped',
      ]);
    });
  });

  describe('when the deterministic workflow id is already taken', () => {
    it('falls back to a server generated workflow id and wires the policies to it', async () => {
      workflowsManagement.createWorkflow
        .mockRejectedValueOnce(new WorkflowConflictError('conflict'))
        .mockResolvedValueOnce({ id: 'generated-workflow-id' });

      const result = await client.installTemplates();

      expect(workflowsManagement.createWorkflow).toHaveBeenNthCalledWith(
        2,
        { yaml: expect.any(String) },
        SPACE_ID,
        request
      );
      expect(result.workflow).toEqual({ id: 'generated-workflow-id', status: 'created' });
      expect(actionPolicyClient.createActionPolicy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            destinations: [{ type: 'workflow', id: 'generated-workflow-id' }],
          }),
        })
      );
    });

    it('rethrows workflow creation errors that are not conflicts', async () => {
      const error = new Error('boom');
      workflowsManagement.createWorkflow.mockRejectedValue(error);

      await expect(client.installTemplates()).rejects.toBe(error);

      expect(actionPolicyClient.createActionPolicy).not.toHaveBeenCalled();
    });
  });

  describe('when a policy is created concurrently', () => {
    it('reports a policy that conflicts on creation as skipped', async () => {
      actionPolicyClient.createActionPolicy.mockImplementation(async ({ options }) => {
        if (options?.id === POLICY_IDS[0]) {
          throw Boom.conflict('already exists');
        }
        return {} as never;
      });

      const result = await client.installTemplates();

      expect(result.policies.map(({ status }) => status)).toEqual([
        'skipped',
        'created',
        'created',
      ]);
    });

    it('rethrows policy creation errors that are not conflicts', async () => {
      const error = Boom.badImplementation('boom');
      actionPolicyClient.createActionPolicy.mockRejectedValue(error);

      await expect(client.installTemplates()).rejects.toBe(error);
    });
  });
});
