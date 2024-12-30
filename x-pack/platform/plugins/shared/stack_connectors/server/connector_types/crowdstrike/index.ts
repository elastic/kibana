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
import { EdrConnectorFeatureId } from '@kbn/actions-plugin/common';
import { urlAllowListValidator, ActionExecutionSourceType } from '@kbn/actions-plugin/server';
import {
  EDR_EXECUTE_PRIVILEGE,
  EDR_SUB_ACTIONS_EXECUTE_PRIVILEGE,
} from '@kbn/actions-plugin/server/feature';
import { ExperimentalFeatures } from '../../../common/experimental_features';
import {
  CROWDSTRIKE_CONNECTOR_ID,
  CROWDSTRIKE_TITLE,
  SUB_ACTION,
} from '../../../common/crowdstrike/constants';
import {
  CrowdstrikeConfigSchema,
  CrowdstrikeSecretsSchema,
} from '../../../common/crowdstrike/schema';
import { CrowdstrikeConfig, CrowdstrikeSecrets } from '../../../common/crowdstrike/types';
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
  supportedFeatureIds: [EdrConnectorFeatureId],
  minimumLicenseRequired: 'enterprise' as const,
  subFeatureType: 'edr',
  getKibanaPrivileges: (args) => {
    const privileges = [EDR_EXECUTE_PRIVILEGE];
    if (
      args?.source === ActionExecutionSourceType.HTTP_REQUEST &&
      args?.params?.subAction !== SUB_ACTION.GET_AGENT_DETAILS
    ) {
      privileges.push(EDR_SUB_ACTIONS_EXECUTE_PRIVILEGE);
    }
    return privileges;
  },
});
