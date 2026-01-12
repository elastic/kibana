/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginSetupContract as ActionsPluginSetupContract } from '@kbn/actions-plugin/server';

import { getJiraServiceManagementConnectorType } from './jira-service-management';
import { getMicrosoftDefenderEndpointConnectorType } from './microsoft_defender_endpoint';
import { getConnectorType as getCasesWebhookConnectorType } from './cases_webhook';
import { getConnectorType as getJiraConnectorType } from './jira';
import { getServiceNowITSMConnectorType } from './servicenow_itsm';
import { getServiceNowSIRConnectorType } from './servicenow_sir';
import { getServiceNowITOMConnectorType } from './servicenow_itom';
import { getTinesConnectorType } from './tines';
import { getResilientConnectorType } from './resilient';
import { getActionType as getTorqConnectorType } from './torq';
import { getConnectorType as getEmailConnectorType } from './email';
import { getConnectorType as getIndexConnectorType } from './es_index';
import { getConnectorType as getOpenAIConnectorType } from './openai';
import { getConnectorType as getBedrockConnectorType } from './bedrock';
import { getConnectorType as getGeminiConnectorType } from './gemini';
import { getConnectorType as getInferenceConnectorType } from './inference';
import { getConnectorType as getPagerDutyConnectorType } from './pagerduty';
import { getConnectorType as getSwimlaneConnectorType } from './swimlane';
import { getConnectorType as getServerLogConnectorType } from './server_log';
import { getConnectorType as getSlackWebhookConnectorType } from './slack';
import { getConnectorType as getSlackApiConnectorType } from './slack_api';
import { getConnectorType as getWebhookConnectorType } from './webhook';
import { getConnectorType as getXmattersConnectorType } from './xmatters';
import { getConnectorType as getTeamsConnectorType } from './teams';
import { getConnectorType as getD3SecurityConnectorType } from './d3security';
import { getConnectorType as getTheHiveConnectorType } from './thehive';
import { getConnectorType as getXSOARConnectorType } from './xsoar';
import { getOpsgenieConnectorType } from './opsgenie';
import { getSentinelOneConnectorType } from './sentinelone';
import { getCrowdstrikeConnectorType } from './crowdstrike';
import { getMcpConnectorType } from './mcp';
import type { ExperimentalFeatures } from '../../common/experimental_features';

export { getConnectorType as getSwimlaneConnectorType } from './swimlane';

export function registerConnectorTypes({
  actions,
  publicBaseUrl,
  experimentalFeatures,
}: {
  actions: ActionsPluginSetupContract;
  publicBaseUrl?: string;
  experimentalFeatures: ExperimentalFeatures;
}) {
  actions.registerType(getEmailConnectorType({ publicBaseUrl }));
  actions.registerType(getIndexConnectorType());
  actions.registerType(getPagerDutyConnectorType());
  actions.registerType(getSwimlaneConnectorType());
  actions.registerType(getServerLogConnectorType());
  actions.registerType(getSlackWebhookConnectorType({}));
  actions.registerType(getSlackApiConnectorType());
  actions.registerType(getWebhookConnectorType());
  actions.registerType(getCasesWebhookConnectorType());
  actions.registerType(getXmattersConnectorType());
  actions.registerType(getServiceNowITSMConnectorType());
  actions.registerType(getServiceNowSIRConnectorType());
  actions.registerType(getServiceNowITOMConnectorType());
  actions.registerType(getJiraConnectorType());
  actions.registerType(getTeamsConnectorType());
  actions.registerType(getTorqConnectorType());

  actions.registerSubActionConnectorType(getOpsgenieConnectorType());
  actions.registerSubActionConnectorType(getJiraServiceManagementConnectorType());
  actions.registerSubActionConnectorType(getTinesConnectorType());
  actions.registerSubActionConnectorType(getOpenAIConnectorType());
  actions.registerSubActionConnectorType(getBedrockConnectorType());
  actions.registerSubActionConnectorType(getGeminiConnectorType());
  actions.registerSubActionConnectorType(getD3SecurityConnectorType());
  actions.registerSubActionConnectorType(getResilientConnectorType());
  actions.registerSubActionConnectorType(getTheHiveConnectorType());
  actions.registerSubActionConnectorType(getXSOARConnectorType());
  actions.registerSubActionConnectorType(getMcpConnectorType());

  if (experimentalFeatures.sentinelOneConnectorOn) {
    actions.registerSubActionConnectorType(getSentinelOneConnectorType());
  }
  if (experimentalFeatures.crowdstrikeConnectorOn) {
    actions.registerSubActionConnectorType(getCrowdstrikeConnectorType(experimentalFeatures));
  }
  if (!experimentalFeatures.inferenceConnectorOff) {
    actions.registerSubActionConnectorType(getInferenceConnectorType());
  }
  actions.registerSubActionConnectorType(getMicrosoftDefenderEndpointConnectorType());
}
