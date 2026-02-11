/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import type { ToolDefinitionWithSchema } from '@kbn/agent-builder-common';
import { isWorkflowTool } from '@kbn/agent-builder-common/tools/types/workflow';

import { WorkflowConfiguration } from '../../sections/configuration_fields/workflow_configuration_fields';

import {
  transformWorkflowFormDataForCreate,
  transformWorkflowFormDataForUpdate,
  transformWorkflowToolToFormData,
} from '../../../../../utils/transform_workflow_form_data';
import { createWorkflowFormValidationSchema } from '../../validation/workflow_tool_form_validation';

import { zodResolver } from '../../../../../utils/zod_resolver';
import { i18nMessages } from '../../i18n';
import type { ToolTypeRegistryEntry } from '../common';
import type { WorkflowToolFormData } from '../../types/tool_form_types';
import { commonToolFormDefaultValues } from '../common';

export const workflowToolRegistryEntry: ToolTypeRegistryEntry<WorkflowToolFormData> = {
  label: i18nMessages.configuration.form.type.workflowOption,
  getConfigurationComponent: () => WorkflowConfiguration,
  defaultValues: {
    ...commonToolFormDefaultValues,
    type: ToolType.workflow,
    workflow_id: '',
    wait_for_completion: true,
  },
  toolToFormData: (tool: ToolDefinitionWithSchema) => {
    if (!isWorkflowTool(tool)) {
      throw new Error('Expected workflow tool');
    }
    return transformWorkflowToolToFormData(tool);
  },
  formDataToCreatePayload: transformWorkflowFormDataForCreate,
  formDataToUpdatePayload: transformWorkflowFormDataForUpdate,
  getValidationResolver: (services) => {
    if (!services?.toolsService) {
      throw new Error('toolsService is required for workflow validation');
    }
    return zodResolver(createWorkflowFormValidationSchema(services.toolsService));
  },
};
