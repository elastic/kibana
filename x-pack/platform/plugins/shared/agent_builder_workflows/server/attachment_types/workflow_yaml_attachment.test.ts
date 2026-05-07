/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerWorkflowYamlAttachment } from './workflow_yaml_attachment';
import { WORKFLOW_YAML_ATTACHMENT_TYPE } from '@kbn/workflows/common/constants';
import { workflowTools } from '../../common/constants';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';

type WorkflowsManagementApi = WorkflowsServerPluginSetup['management'];

interface RegisteredAttachmentType {
  id: string;
  isReadonly: boolean;
  validate: (input: unknown) => { valid: true; data: unknown } | { valid: false; error: string };
  validateOrigin: (
    input: unknown
  ) => { valid: true; data: unknown } | { valid: false; error: string };
  resolve: (
    origin: string,
    context: { spaceId: string }
  ) => Promise<{ yaml: string; workflowId: string; name: string } | undefined>;
  format: (
    attachment: {
      data: {
        yaml: string;
        clientDiagnostics?: Array<{ severity: string; message: string; source: string }>;
      };
    },
    context: { spaceId: string; request: unknown }
  ) => {
    getRepresentation: () => Promise<{ type: 'text'; value: string }>;
  };
  getTools: () => string[];
  getAgentDescription: () => string;
}

const registerAndCapture = (api: Partial<WorkflowsManagementApi> = {}) => {
  let registeredType: RegisteredAttachmentType | undefined;
  const mockAgentBuilder = {
    attachments: {
      registerType: jest.fn((type: unknown) => {
        registeredType = type as RegisteredAttachmentType;
      }),
    },
  } as unknown as AgentBuilderPluginSetup;

  registerWorkflowYamlAttachment(mockAgentBuilder, api as WorkflowsManagementApi);
  return registeredType!;
};

describe('workflow_yaml_attachment', () => {
  describe('getTools', () => {
    it('includes all workflow tools', () => {
      const type = registerAndCapture();
      expect(type.getTools()).toEqual(Object.values(workflowTools));
    });
  });

  describe('validate', () => {
    it('accepts valid workflow data and rejects invalid input', () => {
      const type = registerAndCapture();

      expect(type.validate({ yaml: 'version: "1"' })).toEqual({
        valid: true,
        data: { yaml: 'version: "1"' },
      });
      expect(type.validate({ notYaml: true })).toMatchObject({ valid: false });
    });
  });

  describe('validateOrigin', () => {
    it('accepts a string and rejects non-strings', () => {
      const type = registerAndCapture();

      expect(type.validateOrigin('workflow-id-123')).toEqual({
        valid: true,
        data: 'workflow-id-123',
      });
      expect(type.validateOrigin(42)).toMatchObject({ valid: false });
    });
  });

  describe('resolve', () => {
    it('returns mapped workflow data or undefined when not found', async () => {
      const getWorkflow = jest.fn();
      const type = registerAndCapture({ getWorkflow });

      getWorkflow.mockResolvedValueOnce({ id: 'w1', yaml: 'version: "1"', name: 'My Workflow' });
      await expect(type.resolve('w1', { spaceId: 'default' })).resolves.toEqual({
        yaml: 'version: "1"',
        workflowId: 'w1',
        name: 'My Workflow',
      });
      expect(getWorkflow).toHaveBeenCalledWith('w1', 'default');

      getWorkflow.mockResolvedValueOnce(undefined);
      await expect(type.resolve('missing', { spaceId: 'default' })).resolves.toBeUndefined();
      expect(getWorkflow).toHaveBeenCalledWith('missing', 'default');
    });
  });

  describe('format', () => {
    it('includes successful validation status and forwards context to validation', async () => {
      const validateWorkflow = jest.fn().mockResolvedValue({
        valid: true,
        diagnostics: [],
      });
      const type = registerAndCapture({ validateWorkflow });
      const request = { headers: { authorization: 'Bearer token' } };

      const { getRepresentation } = type.format(
        {
          data: {
            yaml: 'version: "1"',
          },
        },
        { spaceId: 'default', request }
      );
      const result = await getRepresentation();

      expect(validateWorkflow).toHaveBeenCalledWith('version: "1"', 'default', request);
      expect(result.value).toContain('Validation: valid');
    });

    it('includes YAML, validation results, and client diagnostics in representation', async () => {
      const validateWorkflow = jest.fn().mockResolvedValue({
        valid: false,
        diagnostics: [
          { severity: 'error', source: 'schema', message: 'missing name', path: ['name'] },
          { severity: 'warning', source: 'schema', message: 'deprecated field' },
        ],
      });
      const type = registerAndCapture({ validateWorkflow });

      const { getRepresentation } = type.format(
        {
          data: {
            yaml: 'version: "1"',
            clientDiagnostics: [
              { severity: 'error', message: 'parse error', source: 'yaml-parser' },
            ],
          },
        },
        { spaceId: 'default', request: {} }
      );
      const result = await getRepresentation();

      expect(validateWorkflow).toHaveBeenCalledWith('version: "1"', 'default', {});
      expect(result.type).toBe('text');
      expect(result.value).toContain('```yaml\nversion: "1"\n```');
      expect(result.value).toContain('Validation errors (1)');
      expect(result.value).toContain('[schema] missing name (at name)');
      expect(result.value).toContain('Validation warnings (1)');
      expect(result.value).toContain('Client-side validation errors (1)');
      expect(result.value).toContain('[yaml-parser] parse error');
    });

    it('still returns YAML and edit guidance when validation throws', async () => {
      const validateWorkflow = jest.fn().mockRejectedValue(new Error('validation unavailable'));
      const type = registerAndCapture({ validateWorkflow });

      const { getRepresentation } = type.format(
        {
          data: {
            yaml: 'version: "1"',
          },
        },
        { spaceId: 'default', request: {} }
      );
      const result = await getRepresentation();

      expect(result.type).toBe('text');
      expect(result.value).toContain('```yaml\nversion: "1"\n```');
      expect(result.value).not.toContain('Validation: valid');
      expect(result.value).toContain(
        `Use the workflow edit tools (${workflowTools.insertStep}, ${workflowTools.modifyStep}, ${workflowTools.modifyStepProperty}, ${workflowTools.modifyProperty}, ${workflowTools.deleteStep}, ${workflowTools.setYaml})`
      );
    });
  });

  describe('getAgentDescription', () => {
    it('references the attachment type and edit tools', () => {
      const type = registerAndCapture();
      const description = type.getAgentDescription();

      expect(description).toContain(WORKFLOW_YAML_ATTACHMENT_TYPE);
      expect(description).toContain(workflowTools.setYaml);
      expect(description).toContain(workflowTools.modifyStep);
      expect(description).toContain(workflowTools.getStepDefinitions);
    });
  });

  it('registers with correct id and isReadonly', () => {
    const type = registerAndCapture();
    expect(type.id).toBe(WORKFLOW_YAML_ATTACHMENT_TYPE);
    expect(type.isReadonly).toBe(true);
  });
});
