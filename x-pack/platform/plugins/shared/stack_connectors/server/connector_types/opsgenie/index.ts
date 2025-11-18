/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AlertingConnectorFeatureId,
  SecurityConnectorFeatureId,
  UptimeConnectorFeatureId,
} from '@kbn/actions-plugin/common';
import { urlAllowListValidator } from '@kbn/actions-plugin/server';
import type { SubActionConnectorType } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { ValidatorType } from '@kbn/actions-plugin/server/sub_action_framework/types';
import {
  CONNECTOR_ID,
  CONNECTOR_NAME,
  ConfigSchema,
  SecretsSchema,
} from '@kbn/connector-schemas/opsgenie';
import type { Config, Secrets } from '@kbn/connector-schemas/opsgenie';
import { OpsgenieConnector } from './connector';
import { renderParameterTemplates } from './render_template_variables';

export const getOpsgenieConnectorType = (): SubActionConnectorType<Config, Secrets> => {
  return {
    getService: (params) => new OpsgenieConnector(params),
    minimumLicenseRequired: 'platinum',
    name: CONNECTOR_NAME,
    id: CONNECTOR_ID,
    schema: { config: ConfigSchema, secrets: SecretsSchema },
    validators: [{ type: ValidatorType.CONFIG, validator: urlAllowListValidator('apiUrl') }],
    supportedFeatureIds: [
      AlertingConnectorFeatureId,
      UptimeConnectorFeatureId,
      SecurityConnectorFeatureId,
    ],
    renderParameterTemplates,
  };
};
