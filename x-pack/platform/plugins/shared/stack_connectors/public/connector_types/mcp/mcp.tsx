/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import type { GenericValidationResult } from '@kbn/triggers-actions-ui-plugin/public/types';
import type { MCPExecutorParams } from '@kbn/mcp-connector-common';
import { MCP_CONNECTOR_TYPE_ID, MCP_CONNECTOR_TITLE } from '@kbn/mcp-connector-common';
import type { MCPConnector } from './types';

export function getConnectorType(): MCPConnector {
  return {
    id: MCP_CONNECTOR_TYPE_ID,
    iconClass: lazy(() => import('./logo')),
    selectMessage: i18n.translate('xpack.stackConnectors.components.mcp.descriptionText', {
      defaultMessage: 'Connect Elastic AI to your MCP Server',
    }),
    defaultActionParams: {
      subAction: 'listTools',
      subActionParams: {},
    },
    actionTypeTitle: MCP_CONNECTOR_TITLE,
    validateParams: async (
      actionParams: MCPExecutorParams
    ): Promise<GenericValidationResult<unknown>> => {
      return {
        errors: {},
      };
    },
    actionConnectorFields: lazy(() => import('./connector')),
    actionParamsFields: lazy(() => import('./params')),
    isExperimental: true,
    reenterSecretsOnEdit: true,
  };
}
