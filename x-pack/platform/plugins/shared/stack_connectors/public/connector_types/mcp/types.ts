/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MCPConnectorConfig,
  MCPConnectorSecrets,
  MCPExecutorParams,
} from '@kbn/mcp-connector-common';
import type {
  ConnectorFormSchema,
  ActionTypeModel as ConnectorTypeModel,
} from '@kbn/triggers-actions-ui-plugin/public';

export type ConnectorFormData = ConnectorFormSchema<MCPConnectorConfig, MCPConnectorSecrets>;

export type MCPConnector = ConnectorTypeModel<
  MCPConnectorConfig,
  MCPConnectorSecrets,
  MCPExecutorParams
>;
