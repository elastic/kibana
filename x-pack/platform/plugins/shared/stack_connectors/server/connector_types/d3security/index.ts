/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SubActionConnectorType,
  ValidatorType,
} from '@kbn/actions-plugin/server/sub_action_framework/types';
import { urlAllowListValidator } from '@kbn/actions-plugin/server';
import { AlertingConnectorFeatureId, SecurityConnectorFeatureId } from '@kbn/actions-plugin/common';
import { D3SecurityConfigSchema, D3SecuritySecretsSchema } from '../../../common/d3security/schema';
import { renderParameterTemplates } from './render';
import { D3SecurityConnector } from './d3security';
import { D3_SECURITY_CONNECTOR_ID, D3_SECURITY_TITLE } from '../../../common/d3security/constants';
import { D3SecurityConfig, D3SecuritySecrets } from '../../../common/d3security/types';
export type D3SecurityConnectorType = SubActionConnectorType<D3SecurityConfig, D3SecuritySecrets>;

export function getConnectorType(): D3SecurityConnectorType {
  return {
    id: D3_SECURITY_CONNECTOR_ID,
    minimumLicenseRequired: 'gold',
    name: D3_SECURITY_TITLE,
    getService: (params) => new D3SecurityConnector(params),
    supportedFeatureIds: [AlertingConnectorFeatureId, SecurityConnectorFeatureId],
    schema: {
      config: D3SecurityConfigSchema,
      secrets: D3SecuritySecretsSchema,
    },
    validators: [{ type: ValidatorType.CONFIG, validator: urlAllowListValidator('url') }],
    renderParameterTemplates,
  };
}
