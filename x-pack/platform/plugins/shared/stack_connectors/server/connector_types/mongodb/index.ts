/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WorkflowsConnectorFeatureId } from '@kbn/actions-plugin/common';
import type { ValidatorServices } from '@kbn/actions-plugin/server/types';
import {
  ValidatorType,
  type SubActionConnectorType,
} from '@kbn/actions-plugin/server/sub_action_framework/types';
import {
  CONNECTOR_ID,
  CONNECTOR_NAME,
  MongoConnectorConfigSchema,
  MongoConnectorSecretsSchema,
  type MongoConnectorConfig,
  type MongoConnectorSecrets,
} from './schemas';
import { MongoConnector } from './mongodb';

export const getMongoConnectorType = (): SubActionConnectorType<
  MongoConnectorConfig,
  MongoConnectorSecrets
> => ({
  id: CONNECTOR_ID,
  name: CONNECTOR_NAME,
  getService: (params) => new MongoConnector(params),
  schema: {
    config: MongoConnectorConfigSchema,
    secrets: MongoConnectorSecretsSchema,
  },
  validators: [
    { type: ValidatorType.CONFIG, validator: configValidator },
    { type: ValidatorType.SECRETS, validator: secretsValidator },
  ],
  supportedFeatureIds: [WorkflowsConnectorFeatureId],
  minimumLicenseRequired: 'enterprise' as const,
});

const configValidator = (_config: MongoConnectorConfig, _validatorServices: ValidatorServices) => {
  // No URL in config; connectionUri is in secrets. Schema validation is sufficient.
};

const secretsValidator = (secrets: MongoConnectorSecrets) => {
  if (!secrets?.connectionUri || typeof secrets.connectionUri !== 'string') {
    throw new Error('MongoDB connection URI is required');
  }
};
