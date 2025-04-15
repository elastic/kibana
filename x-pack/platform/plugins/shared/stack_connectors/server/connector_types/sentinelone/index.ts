/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SubActionConnectorType } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { ValidatorType } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { EndpointSecurityConnectorFeatureId } from '@kbn/actions-plugin/common';
import { urlAllowListValidator, ActionExecutionSourceType } from '@kbn/actions-plugin/server';
import {
  ENDPOINT_SECURITY_EXECUTE_PRIVILEGE,
  ENDPOINT_SECURITY_SUB_ACTIONS_EXECUTE_PRIVILEGE,
} from '@kbn/actions-plugin/server/feature';
import { SENTINELONE_CONNECTOR_ID, SENTINELONE_TITLE } from '../../../common/sentinelone/constants';
import { SUB_ACTION } from '../../../common/sentinelone/constants';

import {
  SentinelOneConfigSchema,
  SentinelOneSecretsSchema,
} from '../../../common/sentinelone/schema';
import type { SentinelOneConfig, SentinelOneSecrets } from '../../../common/sentinelone/types';
import { SentinelOneConnector } from './sentinelone';
import { renderParameterTemplates } from './render';

export const getSentinelOneConnectorType = (): SubActionConnectorType<
  SentinelOneConfig,
  SentinelOneSecrets
> => ({
  id: SENTINELONE_CONNECTOR_ID,
  name: SENTINELONE_TITLE,
  getService: (params) => new SentinelOneConnector(params),
  schema: {
    config: SentinelOneConfigSchema,
    secrets: SentinelOneSecretsSchema,
  },
  validators: [{ type: ValidatorType.CONFIG, validator: urlAllowListValidator('url') }],
  supportedFeatureIds: [EndpointSecurityConnectorFeatureId],
  minimumLicenseRequired: 'enterprise' as const,
  renderParameterTemplates,
  subFeature: 'endpointSecurity',
  getKibanaPrivileges: (args) => {
    const privileges = [ENDPOINT_SECURITY_EXECUTE_PRIVILEGE];
    if (
      args?.source === ActionExecutionSourceType.HTTP_REQUEST &&
      args?.params?.subAction !== SUB_ACTION.GET_AGENTS
    ) {
      privileges.push(ENDPOINT_SECURITY_SUB_ACTIONS_EXECUTE_PRIVILEGE);
    }
    return privileges;
  },
});
