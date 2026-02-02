/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolDefinitionWithSchema } from '@kbn/agent-builder-common';
import { ToolType } from '@kbn/agent-builder-common';
import { isMcpTool } from '@kbn/agent-builder-common/tools';
import {
  transformMcpFormDataForCreate,
  transformMcpFormDataForUpdate,
  transformMcpToolToFormData,
} from '../../../../../utils/transform_mcp_form_data';
import { zodResolver } from '../../../../../utils/zod_resolver';
import { i18nMessages } from '../../i18n';
import { McpConfiguration } from '../../sections/configuration_fields/mcp_configuration_fields';
import type { McpToolFormData } from '../../types/tool_form_types';
import { mcpToolFormValidationSchema } from '../../validation/mcp_tool_form_validation';
import type { ToolTypeRegistryEntry } from '../common';
import { commonToolFormDefaultValues } from '../common';

export const mcpToolRegistryEntry: ToolTypeRegistryEntry<McpToolFormData> = {
  label: i18nMessages.configuration.form.type.mcpOption,
  getConfigurationComponent: () => McpConfiguration,
  defaultValues: {
    ...commonToolFormDefaultValues,
    type: ToolType.mcp,
    connectorId: '',
    mcpToolName: '',
  },
  toolToFormData: (tool: ToolDefinitionWithSchema) => {
    if (!isMcpTool(tool)) {
      throw new Error('Expected MCP tool');
    }
    return transformMcpToolToFormData(tool);
  },
  formDataToCreatePayload: transformMcpFormDataForCreate,
  formDataToUpdatePayload: transformMcpFormDataForUpdate,
  getValidationResolver: () => zodResolver(mcpToolFormValidationSchema),
};
