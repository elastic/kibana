/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod';
import { ToolType } from '@kbn/agent-builder-common';
import { sharedValidationSchemas } from './shared_tool_validation';

const mcpI18nMessages = {
  connector: {
    requiredError: i18n.translate(
      'xpack.agentBuilder.tools.newTool.validation.mcp.connector_id.requiredError',
      {
        defaultMessage: 'MCP Server is required.',
      }
    ),
  },
  mcpTool: {
    requiredError: i18n.translate(
      'xpack.agentBuilder.tools.newTool.validation.mcp.mcp_tool_name.requiredError',
      {
        defaultMessage: 'Tool is required.',
      }
    ),
  },
};

export const mcpToolFormValidationSchema = z.object({
  ...sharedValidationSchemas,
  connectorId: z.string().min(1, { message: mcpI18nMessages.connector.requiredError }),
  mcpToolName: z.string().min(1, { message: mcpI18nMessages.mcpTool.requiredError }),
  type: z.literal(ToolType.mcp),
});
