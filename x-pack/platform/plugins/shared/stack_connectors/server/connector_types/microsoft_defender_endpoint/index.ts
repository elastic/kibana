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
import { MicrosoftDefenderEndpointConnector } from './microsoft_defender_endpoint';

import type {
  MicrosoftDefenderEndpointConfig,
  MicrosoftDefenderEndpointSecrets,
} from '../../../common/microsoft_defender_endpoint/types';
import {
  MicrosoftDefenderEndpointConfigSchema,
  MicrosoftDefenderEndpointSecretsSchema,
} from '../../../common/microsoft_defender_endpoint/schema';
import {
  MICROSOFT_DEFENDER_ENDPOINT_CONNECTOR_ID,
  MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION,
  MICROSOFT_DEFENDER_ENDPOINT_TITLE,
} from '../../../common/microsoft_defender_endpoint/constants';

export const getMicrosoftDefenderEndpointConnectorType = (): SubActionConnectorType<
  MicrosoftDefenderEndpointConfig,
  MicrosoftDefenderEndpointSecrets
> => ({
  id: MICROSOFT_DEFENDER_ENDPOINT_CONNECTOR_ID,
  name: MICROSOFT_DEFENDER_ENDPOINT_TITLE,
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
      args?.params?.subAction !== MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.TEST_CONNECTOR
    ) {
      privileges.push(ENDPOINT_SECURITY_SUB_ACTIONS_EXECUTE_PRIVILEGE);
    }
    return privileges;
  },
});
