/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import type { WorkflowToolDefinition } from '@kbn/agent-builder-common/tools';
import { ToolType } from '@kbn/agent-builder-common';
import type { WorkflowToolFormData } from '../components/tools/form/types/tool_form_types';
import {
  transformWorkflowToolToFormData,
  transformFormDataToWorkflowTool,
  transformWorkflowFormDataForCreate,
  transformWorkflowFormDataForUpdate,
} from './transform_workflow_form_data';

describe('transformWorkflowFormData', () => {
  let mockFormData: WorkflowToolFormData;
  let mockTool: WorkflowToolDefinition;

  beforeEach(() => {
    mockFormData = {
      toolId: 'my-workflow-tool',
      description: 'A workflow tool for testing.',
      workflow_id: 'workflow-123',
      wait_for_completion: true,
      confirmation_ask_user: 'never',
      labels: ['test', 'workflow'],
      type: ToolType.workflow,
    };

    mockTool = {
      id: 'my-workflow-tool',
      description: 'A workflow tool for testing.',
      readonly: false,
      experimental: false,
      configuration: {
        workflow_id: 'workflow-123',
        wait_for_completion: true,
      },
      type: ToolType.workflow,
      tags: ['test', 'workflow'],
    };
  });

  describe('transformWorkflowToolToFormData', () => {
    it('should transform a workflow tool to form data', () => {
      const result = transformWorkflowToolToFormData(mockTool);
      expect(result).toEqual(mockFormData);
    });

    it('defaults confirmation_ask_user to never when tool has no confirmation', () => {
      const result = transformWorkflowToolToFormData(mockTool);
      expect(result.confirmation_ask_user).toBe('never');
    });

    it('maps confirmation.askUser to confirmation_ask_user', () => {
      const toolWithConfirmation: WorkflowToolDefinition = {
        ...mockTool,
        confirmation: { askUser: 'always' },
      };

      const result = transformWorkflowToolToFormData(toolWithConfirmation);
      expect(result.confirmation_ask_user).toBe('always');
    });
  });

  describe('transformFormDataToWorkflowTool', () => {
    it('should transform form data to a workflow tool', () => {
      const result = transformFormDataToWorkflowTool(mockFormData);
      expect(result).toEqual(mockTool);
    });

    it('omits confirmation entirely when confirmation_ask_user is never', () => {
      const result = transformFormDataToWorkflowTool({
        ...mockFormData,
        confirmation_ask_user: 'never',
      });
      expect(result.confirmation).toBeUndefined();
    });

    it('sets confirmation when confirmation_ask_user is once', () => {
      const result = transformFormDataToWorkflowTool({
        ...mockFormData,
        confirmation_ask_user: 'once',
      });
      expect(result.confirmation).toEqual({ askUser: 'once' });
    });

    it('sets confirmation when confirmation_ask_user is always', () => {
      const result = transformFormDataToWorkflowTool({
        ...mockFormData,
        confirmation_ask_user: 'always',
      });
      expect(result.confirmation).toEqual({ askUser: 'always' });
    });
  });

  describe('transformWorkflowFormDataForCreate', () => {
    it('should transform workflow form data to a create tool payload', () => {
      const expectedPayload = omit(mockTool, ['readonly', 'experimental']);
      const result = transformWorkflowFormDataForCreate(mockFormData);
      expect(result).toEqual(expectedPayload);
    });

    it('includes confirmation in the create payload when policy is not never', () => {
      const result = transformWorkflowFormDataForCreate({
        ...mockFormData,
        confirmation_ask_user: 'once',
      });
      expect(result.confirmation).toEqual({ askUser: 'once' });
    });

    it('omits confirmation from the create payload when policy is never', () => {
      const result = transformWorkflowFormDataForCreate({
        ...mockFormData,
        confirmation_ask_user: 'never',
      });
      expect(result.confirmation).toBeUndefined();
    });
  });

  describe('transformWorkflowFormDataForUpdate', () => {
    it('should transform workflow form data to an update tool payload', () => {
      const expectedPayload = omit(mockTool, ['id', 'type', 'readonly', 'experimental']);
      const result = transformWorkflowFormDataForUpdate(mockFormData);
      expect(result).toEqual(expectedPayload);
    });

    it('includes confirmation in the update payload when policy is not never', () => {
      const result = transformWorkflowFormDataForUpdate({
        ...mockFormData,
        confirmation_ask_user: 'always',
      });
      expect(result.confirmation).toEqual({ askUser: 'always' });
    });

    it('omits confirmation from the update payload when policy is never', () => {
      const result = transformWorkflowFormDataForUpdate({
        ...mockFormData,
        confirmation_ask_user: 'never',
      });
      expect(result.confirmation).toBeUndefined();
    });
  });
});
