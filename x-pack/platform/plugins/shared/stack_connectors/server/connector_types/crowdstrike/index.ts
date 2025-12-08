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
import {
  CONNECTOR_ID,
  CONNECTOR_NAME,
  SUB_ACTION,
  CrowdstrikeConfigSchema,
  CrowdstrikeSecretsSchema,
} from '@kbn/connector-schemas/crowdstrike';
import type { CrowdstrikeConfig, CrowdstrikeSecrets } from '@kbn/connector-schemas/crowdstrike';
import type { ExperimentalFeatures } from '../../../common/experimental_features';
import { CrowdstrikeConnector } from './crowdstrike';

export const getCrowdstrikeConnectorType = (
  experimentalFeatures: ExperimentalFeatures
): SubActionConnectorType<CrowdstrikeConfig, CrowdstrikeSecrets> => ({
  id: CONNECTOR_ID,
  name: CONNECTOR_NAME,
  getService: (params) => new CrowdstrikeConnector(params, experimentalFeatures),
  schema: {
    config: CrowdstrikeConfigSchema,
    secrets: CrowdstrikeSecretsSchema,
  },
  validators: [{ type: ValidatorType.CONFIG, validator: urlAllowListValidator('url') }],
  supportedFeatureIds: [EndpointSecurityConnectorFeatureId],
  minimumLicenseRequired: 'enterprise' as const,
  subFeature: 'endpointSecurity',
  getKibanaPrivileges: (args) => {
    const privileges = [ENDPOINT_SECURITY_EXECUTE_PRIVILEGE];
    if (
      args?.source === ActionExecutionSourceType.HTTP_REQUEST &&
      args?.params?.subAction !== SUB_ACTION.GET_AGENT_DETAILS
    ) {
      privileges.push(ENDPOINT_SECURITY_SUB_ACTIONS_EXECUTE_PRIVILEGE);
    }
    return privileges;
  },
});
