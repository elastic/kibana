/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  GenerativeAIForObservabilityConnectorFeatureId,
  GenerativeAIForSearchPlaygroundConnectorFeatureId,
  GenerativeAIForSecurityConnectorFeatureId,
  WorkflowsConnectorFeatureId,
} from '@kbn/actions-plugin/common';
import { urlAllowListValidator } from '@kbn/actions-plugin/server';
import type { ValidatorServices } from '@kbn/actions-plugin/server/types';
import {
  ValidatorType,
  type SubActionConnectorType,
} from '@kbn/actions-plugin/server/sub_action_framework/types';
import {
  CONNECTOR_ID,
  CONNECTOR_NAME,
  MCPConnectorConfigSchema,
  MCPConnectorSecretsSchema,
  type MCPConnectorConfig,
  type MCPConnectorSecrets,
} from '@kbn/connector-schemas/mcp';
import { McpConnector } from './mcp';

export const getMcpConnectorType = (): SubActionConnectorType<
  MCPConnectorConfig,
  MCPConnectorSecrets
> => ({
  id: CONNECTOR_ID,
  name: CONNECTOR_NAME,
  getService: (params) => new McpConnector(params),
  schema: {
    config: MCPConnectorConfigSchema,
    secrets: MCPConnectorSecretsSchema,
  },
  validators: [
    { type: ValidatorType.CONFIG, validator: configValidator },
    { type: ValidatorType.SECRETS, validator: secretsValidator },
  ],
  supportedFeatureIds: [
    GenerativeAIForSecurityConnectorFeatureId,
    GenerativeAIForSearchPlaygroundConnectorFeatureId,
    GenerativeAIForObservabilityConnectorFeatureId,
    WorkflowsConnectorFeatureId,
  ],
  minimumLicenseRequired: 'enterprise' as const,
});

const configValidator = (config: MCPConnectorConfig, validatorServices: ValidatorServices) => {
  // Validate that the URL is allowed
  urlAllowListValidator('serverUrl')(config, validatorServices);
};

const secretsValidator = (_secrets: MCPConnectorSecrets) => {
  // Schema validation handles all secret field validation
  // Additional validation can be added here if needed
};
