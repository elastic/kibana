/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SubActionConnectorType } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { ValidatorType } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { urlAllowListValidator } from '@kbn/actions-plugin/server';
import {
  AlertingConnectorFeatureId,
  SecurityConnectorFeatureId,
  WorkflowsConnectorFeatureId,
} from '@kbn/actions-plugin/common';
import {
  CONNECTOR_ID,
  CONNECTOR_NAME,
  D3SecurityConfigSchema,
  D3SecuritySecretsSchema,
} from '@kbn/connector-schemas/d3security';
import type { D3SecurityConfig, D3SecuritySecrets } from '@kbn/connector-schemas/d3security';
import { renderParameterTemplates } from './render';
import { D3SecurityConnector } from './d3security';
export type D3SecurityConnectorType = SubActionConnectorType<D3SecurityConfig, D3SecuritySecrets>;

export function getConnectorType(): D3SecurityConnectorType {
  return {
    id: CONNECTOR_ID,
    minimumLicenseRequired: 'gold',
    name: CONNECTOR_NAME,
    getService: (params) => new D3SecurityConnector(params),
    supportedFeatureIds: [
      AlertingConnectorFeatureId,
      SecurityConnectorFeatureId,
      WorkflowsConnectorFeatureId,
    ],
    schema: {
      config: D3SecurityConfigSchema,
      secrets: D3SecuritySecretsSchema,
    },
    validators: [{ type: ValidatorType.CONFIG, validator: urlAllowListValidator('url') }],
    renderParameterTemplates,
  };
}
