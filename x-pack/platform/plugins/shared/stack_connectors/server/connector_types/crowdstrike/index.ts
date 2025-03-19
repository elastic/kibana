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
import type { ExperimentalFeatures } from '../../../common/experimental_features';
import {
  CROWDSTRIKE_CONNECTOR_ID,
  CROWDSTRIKE_TITLE,
  SUB_ACTION,
} from '../../../common/crowdstrike/constants';
import {
  CrowdstrikeConfigSchema,
  CrowdstrikeSecretsSchema,
} from '../../../common/crowdstrike/schema';
import type { CrowdstrikeConfig, CrowdstrikeSecrets } from '../../../common/crowdstrike/types';
import { CrowdstrikeConnector } from './crowdstrike';

export const getCrowdstrikeConnectorType = (
  experimentalFeatures: ExperimentalFeatures
): SubActionConnectorType<CrowdstrikeConfig, CrowdstrikeSecrets> => ({
  id: CROWDSTRIKE_CONNECTOR_ID,
  name: CROWDSTRIKE_TITLE,
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
