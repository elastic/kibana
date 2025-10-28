/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/onechat-common';
import type { WorkflowToolDefinition } from '@kbn/onechat-common/tools';
import type { WorkflowToolFormData } from '../components/tools/form/types/tool_form_types';
import {
  transformWorkflowToolToFormData,
  transformFormDataToWorkflowTool,
  transformWorkflowFormDataForCreate,
  transformWorkflowFormDataForUpdate,
} from './transform_workflow_form_data';

describe('transform_workflow_form_data', () => {
  describe('transformWorkflowToolToFormData', () => {
    it('should transform a workflow tool to form data', () => {
      const tool: WorkflowToolDefinition = {
        id: 'test-workflow-tool',
        description: 'Test workflow tool',
        readonly: false,
        configuration: {
          workflow_id: 'workflow-123',
        },
        type: ToolType.workflow,
        tags: ['tag1', 'tag2'],
      };

      const result = transformWorkflowToolToFormData(tool);

      expect(result).toEqual({
        toolId: 'test-workflow-tool',
        description: 'Test workflow tool',
        workflow_id: 'workflow-123',
        exclude_details: undefined,
        labels: ['tag1', 'tag2'],
        type: ToolType.workflow,
      });
    });

    it('should include exclude_details when present', () => {
      const tool: WorkflowToolDefinition = {
        id: 'test-workflow-tool',
        description: 'Test workflow tool',
        readonly: false,
        configuration: {
          workflow_id: 'workflow-123',
          exclude_details: true,
        },
        type: ToolType.workflow,
        tags: ['tag1', 'tag2'],
      };

      const result = transformWorkflowToolToFormData(tool);

      expect(result).toEqual({
        toolId: 'test-workflow-tool',
        description: 'Test workflow tool',
        workflow_id: 'workflow-123',
        exclude_details: true,
        labels: ['tag1', 'tag2'],
        type: ToolType.workflow,
      });
    });

    it('should handle exclude_details: false', () => {
      const tool: WorkflowToolDefinition = {
        id: 'test-workflow-tool',
        description: 'Test workflow tool',
        readonly: false,
        configuration: {
          workflow_id: 'workflow-123',
          exclude_details: false,
        },
        type: ToolType.workflow,
        tags: [],
      };

      const result = transformWorkflowToolToFormData(tool);

      expect(result.exclude_details).toBe(false);
    });
  });

  describe('transformFormDataToWorkflowTool', () => {
    it('should transform form data to a workflow tool', () => {
      const formData: WorkflowToolFormData = {
        toolId: 'test-workflow-tool',
        description: 'Test workflow tool',
        workflow_id: 'workflow-123',
        labels: ['tag1', 'tag2'],
        type: ToolType.workflow,
      };

      const result = transformFormDataToWorkflowTool(formData);

      expect(result).toEqual({
        id: 'test-workflow-tool',
        description: 'Test workflow tool',
        readonly: false,
        configuration: {
          workflow_id: 'workflow-123',
          exclude_details: undefined,
        },
        type: ToolType.workflow,
        tags: ['tag1', 'tag2'],
      });
    });

    it('should include exclude_details when present', () => {
      const formData: WorkflowToolFormData = {
        toolId: 'test-workflow-tool',
        description: 'Test workflow tool',
        workflow_id: 'workflow-123',
        exclude_details: true,
        labels: ['tag1'],
        type: ToolType.workflow,
      };

      const result = transformFormDataToWorkflowTool(formData);

      expect(result.configuration.exclude_details).toBe(true);
    });

    it('should handle exclude_details: false', () => {
      const formData: WorkflowToolFormData = {
        toolId: 'test-workflow-tool',
        description: 'Test workflow tool',
        workflow_id: 'workflow-123',
        exclude_details: false,
        labels: [],
        type: ToolType.workflow,
      };

      const result = transformFormDataToWorkflowTool(formData);

      expect(result.configuration.exclude_details).toBe(false);
    });
  });

  describe('transformWorkflowFormDataForCreate', () => {
    it('should create payload without readonly field', () => {
      const formData: WorkflowToolFormData = {
        toolId: 'test-workflow-tool',
        description: 'Test workflow tool',
        workflow_id: 'workflow-123',
        exclude_details: true,
        labels: ['tag1'],
        type: ToolType.workflow,
      };

      const result = transformWorkflowFormDataForCreate(formData);

      expect(result).toEqual({
        id: 'test-workflow-tool',
        description: 'Test workflow tool',
        configuration: {
          workflow_id: 'workflow-123',
          exclude_details: true,
        },
        type: ToolType.workflow,
        tags: ['tag1'],
      });
      expect(result).not.toHaveProperty('readonly');
    });
  });

  describe('transformWorkflowFormDataForUpdate', () => {
    it('should create update payload without id, type, and readonly fields', () => {
      const formData: WorkflowToolFormData = {
        toolId: 'test-workflow-tool',
        description: 'Test workflow tool',
        workflow_id: 'workflow-123',
        exclude_details: true,
        labels: ['tag1'],
        type: ToolType.workflow,
      };

      const result = transformWorkflowFormDataForUpdate(formData);

      expect(result).toEqual({
        description: 'Test workflow tool',
        configuration: {
          workflow_id: 'workflow-123',
          exclude_details: true,
        },
        tags: ['tag1'],
      });
      expect(result).not.toHaveProperty('id');
      expect(result).not.toHaveProperty('type');
      expect(result).not.toHaveProperty('readonly');
    });

    it('should preserve exclude_details: false in update payload', () => {
      const formData: WorkflowToolFormData = {
        toolId: 'test-workflow-tool',
        description: 'Test workflow tool',
        workflow_id: 'workflow-123',
        exclude_details: false,
        labels: [],
        type: ToolType.workflow,
      };

      const result = transformWorkflowFormDataForUpdate(formData);

      expect(result.configuration).toEqual({
        workflow_id: 'workflow-123',
        exclude_details: false,
      });
    });
  });

  describe('round-trip transformation', () => {
    it('should preserve exclude_details: true through round-trip', () => {
      const originalTool: WorkflowToolDefinition = {
        id: 'test-tool',
        description: 'Test',
        readonly: false,
        configuration: {
          workflow_id: 'wf-1',
          exclude_details: true,
        },
        type: ToolType.workflow,
        tags: [],
      };

      const formData = transformWorkflowToolToFormData(originalTool);
      expect(formData.exclude_details).toBe(true);

      const backToTool = transformFormDataToWorkflowTool(formData);
      expect(backToTool.configuration.exclude_details).toBe(true);
    });

    it('should preserve exclude_details: false through round-trip', () => {
      const originalTool: WorkflowToolDefinition = {
        id: 'test-tool',
        description: 'Test',
        readonly: false,
        configuration: {
          workflow_id: 'wf-1',
          exclude_details: false,
        },
        type: ToolType.workflow,
        tags: [],
      };

      const formData = transformWorkflowToolToFormData(originalTool);
      expect(formData.exclude_details).toBe(false);

      const backToTool = transformFormDataToWorkflowTool(formData);
      expect(backToTool.configuration.exclude_details).toBe(false);
    });
  });
});
