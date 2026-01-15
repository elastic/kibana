/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SubActionConnectorType } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { ValidatorType } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { EndpointSecurityConnectorFeatureId } from '@kbn/actions-plugin/common';
import { ActionExecutionSourceType, urlAllowListValidator } from '@kbn/actions-plugin/server';
import {
  ENDPOINT_SECURITY_EXECUTE_PRIVILEGE,
  ENDPOINT_SECURITY_SUB_ACTIONS_EXECUTE_PRIVILEGE,
} from '@kbn/actions-plugin/server/feature';
import type {
  MicrosoftDefenderEndpointConfig,
  MicrosoftDefenderEndpointSecrets,
} from '@kbn/connector-schemas/microsoft_defender_endpoint';
import {
  CONNECTOR_ID,
  CONNECTOR_NAME,
  SUB_ACTION,
  MicrosoftDefenderEndpointConfigSchema,
  MicrosoftDefenderEndpointSecretsSchema,
} from '@kbn/connector-schemas/microsoft_defender_endpoint';
import { MicrosoftDefenderEndpointConnector } from './microsoft_defender_endpoint';

export const getMicrosoftDefenderEndpointConnectorType = (): SubActionConnectorType<
  MicrosoftDefenderEndpointConfig,
  MicrosoftDefenderEndpointSecrets
> => ({
  id: CONNECTOR_ID,
  name: CONNECTOR_NAME,
  getService: (params) => new MicrosoftDefenderEndpointConnector(params),
  schema: {
    config: MicrosoftDefenderEndpointConfigSchema,
    secrets: MicrosoftDefenderEndpointSecretsSchema,
  },
  validators: [
    { type: ValidatorType.CONFIG, validator: urlAllowListValidator('oAuthServerUrl') },
    { type: ValidatorType.CONFIG, validator: urlAllowListValidator('apiUrl') },
  ],
  supportedFeatureIds: [EndpointSecurityConnectorFeatureId],
  minimumLicenseRequired: 'enterprise' as const,
  subFeature: 'endpointSecurity',
  getKibanaPrivileges: (args) => {
    const privileges = [ENDPOINT_SECURITY_EXECUTE_PRIVILEGE];
    if (
      args?.source === ActionExecutionSourceType.HTTP_REQUEST &&
      args?.params?.subAction !== SUB_ACTION.TEST_CONNECTOR
    ) {
      privileges.push(ENDPOINT_SECURITY_SUB_ACTIONS_EXECUTE_PRIVILEGE);
    }
    return privileges;
  },
});
