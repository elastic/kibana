/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SubActionConnectorType } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { ValidatorType } from '@kbn/actions-plugin/server/sub_action_framework/types';
import {
  AlertingConnectorFeatureId,
  CasesConnectorFeatureId,
  SecurityConnectorFeatureId,
  WorkflowsConnectorFeatureId,
} from '@kbn/actions-plugin/common';
import { urlAllowListValidator } from '@kbn/actions-plugin/server';

import type { ResilientConfig, ResilientSecrets } from '@kbn/connector-schemas/resilient';
import {
  CONNECTOR_ID,
  CONNECTOR_NAME,
  ExternalIncidentServiceConfigurationSchema,
  ExternalIncidentServiceSecretConfigurationSchema,
  PushToServiceIncidentSchema,
} from '@kbn/connector-schemas/resilient';
import { ResilientConnector } from './resilient';

export const getResilientConnectorType = (): SubActionConnectorType<
  ResilientConfig,
  ResilientSecrets
> => ({
  id: CONNECTOR_ID,
  minimumLicenseRequired: 'platinum',
  name: CONNECTOR_NAME,
  getService: (params) => new ResilientConnector(params, PushToServiceIncidentSchema),
  schema: {
    config: ExternalIncidentServiceConfigurationSchema,
    secrets: ExternalIncidentServiceSecretConfigurationSchema,
  },
  supportedFeatureIds: [
    AlertingConnectorFeatureId,
    CasesConnectorFeatureId,
    SecurityConnectorFeatureId,
    WorkflowsConnectorFeatureId,
  ],
  validators: [{ type: ValidatorType.CONFIG, validator: urlAllowListValidator('apiUrl') }],
});
