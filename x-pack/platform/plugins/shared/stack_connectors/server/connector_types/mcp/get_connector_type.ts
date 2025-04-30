/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MCP_CONNECTOR_TYPE_ID,
  MCP_CONNECTOR_TITLE,
  type MCPConnectorConfig,
  type MCPConnectorSecrets,
} from '@kbn/mcp-connector-common';
import { MCPConnectorConfigSchema, MCPConnectorSecretsSchema } from '@kbn/mcp-connector-server';
import type { SubActionConnectorType } from '@kbn/actions-plugin/server/sub_action_framework/types';
import {
  GenerativeAIForObservabilityConnectorFeatureId,
  GenerativeAIForSearchPlaygroundConnectorFeatureId,
  GenerativeAIForSecurityConnectorFeatureId,
} from '@kbn/actions-plugin/common';
import { MCPConnector } from './mcp_connector';

export function getConnectorType(): SubActionConnectorType<
  MCPConnectorConfig,
  MCPConnectorSecrets
> {
  return {
    id: MCP_CONNECTOR_TYPE_ID,
    name: MCP_CONNECTOR_TITLE,
    getService: (params) => new MCPConnector(params),
    minimumLicenseRequired: 'enterprise',
    schema: {
      config: MCPConnectorConfigSchema,
      secrets: MCPConnectorSecretsSchema,
    },
    supportedFeatureIds: [
      GenerativeAIForSecurityConnectorFeatureId,
      GenerativeAIForSearchPlaygroundConnectorFeatureId,
      GenerativeAIForObservabilityConnectorFeatureId,
    ],
  };
}
