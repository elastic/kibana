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
import {
  ValidatorType,
  type SubActionConnectorType,
} from '@kbn/actions-plugin/server/sub_action_framework/types';
import {
  CONNECTOR_ID,
  CONNECTOR_NAME,
  ConfigSchema,
  SecretsSchema,
  type Config,
  type Secrets,
} from '@kbn/connector-schemas/mcp';
import { McpConnector } from './mcp';

export const getMcpConnectorType = (): SubActionConnectorType<Config, Secrets> => ({
  id: CONNECTOR_ID,
  name: CONNECTOR_NAME,
  getService: (params) => new McpConnector(params),
  schema: {
    config: ConfigSchema,
    secrets: SecretsSchema,
  },
  validators: [
    { type: ValidatorType.CONFIG, validator: urlAllowListValidator('serverUrl') },
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

const secretsValidator = (secrets: Secrets) => {
  return;
};
