/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowToolDefinition } from '@kbn/agent-builder-common/tools';
import { ToolType } from '@kbn/agent-builder-common';
import { omit } from 'lodash';
import type { CreateToolPayload, UpdateToolPayload } from '../../../common/http_api/tools';
import type { WorkflowToolFormData } from '../components/tools/form/types/tool_form_types';

export const transformWorkflowToolToFormData = (
  tool: WorkflowToolDefinition
): WorkflowToolFormData => {
  return {
    toolId: tool.id,
    description: tool.description,
    workflow_id: tool.configuration.workflow_id,
    wait_for_completion: tool.configuration.wait_for_completion ?? true,
    labels: tool.tags,
    type: ToolType.workflow,
  };
};

export const transformFormDataToWorkflowTool = (
  data: WorkflowToolFormData
): WorkflowToolDefinition => {
  return {
    id: data.toolId,
    description: data.description,
    readonly: false,
    configuration: {
      workflow_id: data.workflow_id,
      wait_for_completion: data.wait_for_completion,
    },
    type: ToolType.workflow,
    tags: data.labels,
  };
};

export const transformWorkflowFormDataForCreate = (
  data: WorkflowToolFormData
): CreateToolPayload => {
  return omit(transformFormDataToWorkflowTool(data), ['readonly']);
};

export const transformWorkflowFormDataForUpdate = (
  data: WorkflowToolFormData
): UpdateToolPayload => {
  return omit(transformFormDataToWorkflowTool(data), ['id', 'type', 'readonly']);
};
