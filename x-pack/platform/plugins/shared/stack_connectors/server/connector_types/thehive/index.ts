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
  SecurityConnectorFeatureId,
  UptimeConnectorFeatureId,
  CasesConnectorFeatureId,
  WorkflowsConnectorFeatureId,
} from '@kbn/actions-plugin/common';
import { urlAllowListValidator } from '@kbn/actions-plugin/server';
import {
  CONNECTOR_ID,
  CONNECTOR_NAME,
  PushToServiceIncidentSchema,
  TheHiveConfigSchema,
  TheHiveSecretsSchema,
} from '@kbn/connector-schemas/thehive';
import type { TheHiveConfig, TheHiveSecrets } from '@kbn/connector-schemas/thehive';
import { TheHiveConnector } from './thehive';
import { renderParameterTemplates } from './render';

export type TheHiveConnectorType = SubActionConnectorType<TheHiveConfig, TheHiveSecrets>;

export function getConnectorType(): TheHiveConnectorType {
  return {
    id: CONNECTOR_ID,
    minimumLicenseRequired: 'platinum',
    name: CONNECTOR_NAME,
    getService: (params) => new TheHiveConnector(params, PushToServiceIncidentSchema),
    supportedFeatureIds: [
      AlertingConnectorFeatureId,
      SecurityConnectorFeatureId,
      UptimeConnectorFeatureId,
      CasesConnectorFeatureId,
      WorkflowsConnectorFeatureId,
    ],
    schema: {
      config: TheHiveConfigSchema,
      secrets: TheHiveSecretsSchema,
    },
    renderParameterTemplates,
    validators: [{ type: ValidatorType.CONFIG, validator: urlAllowListValidator('url') }],
  };
}
