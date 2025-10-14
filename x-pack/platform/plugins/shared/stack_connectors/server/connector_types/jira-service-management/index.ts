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
import { ValidatorType } from '@kbn/actions-plugin/server/sub_action_framework/types';
import type { SubActionConnectorType } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { JIRA_SERVICE_MANAGEMENT_CONNECTOR_TYPE_ID } from '../../../common/jira-service-management/constants';
import { JiraServiceManagementConnector } from './connector';
import { ConfigSchema, SecretsSchema } from './schema';
import type { Config, Secrets } from './types';
import * as i18n from './translations';
import { renderParameterTemplates } from './render_template_variables';

export const getJiraServiceManagementConnectorType = (): SubActionConnectorType<
  Config,
  Secrets
> => {
  return {
    getService: (params) => new JiraServiceManagementConnector(params),
    minimumLicenseRequired: 'platinum',
    name: i18n.JIRA_SERVICE_MANAGEMENT_NAME,
    id: JIRA_SERVICE_MANAGEMENT_CONNECTOR_TYPE_ID,
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

export { JIRA_SERVICE_MANAGEMENT_CONNECTOR_TYPE_ID };

export type {
  Config as JiraServiceManagementActionConfig,
  Secrets as JiraServiceManagementActionSecrets,
  Params as JiraServiceManagementActionParams,
  CreateAlertSubActionParams as JiraServiceManagementCreateAlertSubActionParams,
  CloseAlertSubActionParams as JiraServiceManagementCloseAlertSubActionParams,
  CreateAlertParams as JiraServiceManagementCreateAlertParams,
  CloseAlertParams as JiraServiceManagementCloseAlertParams,
} from './types';
