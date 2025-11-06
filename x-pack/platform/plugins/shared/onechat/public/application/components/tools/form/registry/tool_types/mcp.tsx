/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ToolType } from '@kbn/onechat-common';
import React from 'react';
import { EuiCallOut, EuiText } from '@elastic/eui';

import type { ToolTypeRegistryEntry } from '../common';
import type { McpToolFormData } from '../../types/tool_form_types';
import { transformMcpToolToFormData } from '../../../../../utils/transform_mcp_tool_to_form_data';

const McpToolConfigurationComponent: React.FC = () => {
  return (
    <EuiCallOut
      title={i18n.translate('xpack.onechat.toolForm.mcp.readOnlyTitle', {
        defaultMessage: 'MCP tools are read-only',
      })}
      color="primary"
      iconType="iInCircle"
    >
      <EuiText size="s">
        {i18n.translate('xpack.onechat.toolForm.mcp.readOnlyDescription', {
          defaultMessage:
            'MCP (Model Context Protocol) tools are provided by external MCP servers and cannot be created or edited through this interface. To add MCP tools, configure MCP server connectors.',
        })}
      </EuiText>
    </EuiCallOut>
  );
};

export const mcpToolRegistryEntry: ToolTypeRegistryEntry<McpToolFormData> = {
  label: i18n.translate('xpack.onechat.toolForm.mcp.label', {
    defaultMessage: 'MCP Tool',
  }),

  getConfigurationComponent: () => McpToolConfigurationComponent,

  defaultValues: {
    type: ToolType.mcp,
    toolId: '',
    description: '',
    labels: [],
    configuration: {},
  },

  toolToFormData: transformMcpToolToFormData,

  formDataToCreatePayload: () => {
    throw new Error(
      'Cannot create MCP tool through UI - MCP tools are provided by external servers'
    );
  },

  formDataToUpdatePayload: () => {
    throw new Error(
      'Cannot update MCP tool through UI - MCP tools are provided by external servers'
    );
  },

  getValidationResolver: () => {
    return async () => ({ values: {}, errors: {} });
  },
};
