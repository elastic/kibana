/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginSetupContract as ActionsPluginSetupContract } from '@kbn/actions-plugin/server';

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
import { getOpsgenieConnectorType } from './opsgenie';
import type { ActionParamsType as ServiceNowITSMActionParams } from './servicenow_itsm';
import type { ActionParamsType as ServiceNowSIRActionParams } from './servicenow_sir';
import { getSentinelOneConnectorType } from './sentinelone';
import { getCrowdstrikeConnectorType } from './crowdstrike';
import { ExperimentalFeatures } from '../../common/experimental_features';

export { ConnectorTypeId as CasesWebhookConnectorTypeId } from './cases_webhook';
export type { ActionParamsType as CasesWebhookActionParams } from './cases_webhook';
export { ConnectorTypeId as JiraConnectorTypeId } from './jira';
export type { ActionParamsType as JiraActionParams } from './jira';
export { ServiceNowITSMConnectorTypeId } from './servicenow_itsm';
export { ServiceNowSIRConnectorTypeId } from './servicenow_sir';
export { ConnectorTypeId as EmailConnectorTypeId } from './email';
export type { ActionParamsType as EmailActionParams } from './email';
export { ConnectorTypeId as IndexConnectorTypeId } from './es_index';
export type { ActionParamsType as IndexActionParams } from './es_index';
export { ConnectorTypeId as PagerDutyConnectorTypeId } from './pagerduty';
export type { ActionParamsType as PagerDutyActionParams } from './pagerduty';
export { ConnectorTypeId as ServerLogConnectorTypeId } from './server_log';
export type { ActionParamsType as ServerLogActionParams } from './server_log';
export { ServiceNowITOMConnectorTypeId } from './servicenow_itom';
export { ConnectorTypeId as SlackWebhookConnectorTypeId } from './slack';
export type { ActionParamsType as SlackWebhookActionParams } from './slack';
export { SLACK_API_CONNECTOR_ID as SlackApiConnectorTypeId } from '../../common/slack_api/constants';
export type { SlackApiActionParams as SlackApiActionParams } from '../../common/slack_api/types';
export { ConnectorTypeId as TeamsConnectorTypeId } from './teams';
export type { ActionParamsType as TeamsActionParams } from './teams';
export { ConnectorTypeId as WebhookConnectorTypeId } from './webhook';
export type { ActionParamsType as WebhookActionParams } from './webhook/types';
export { ConnectorTypeId as XmattersConnectorTypeId } from './xmatters';
export type { ActionParamsType as XmattersActionParams } from './xmatters';
export { OpsgenieConnectorTypeId } from './opsgenie';

export type {
  OpsgenieActionConfig,
  OpsgenieActionSecrets,
  OpsgenieActionParams,
  OpsgenieCloseAlertSubActionParams,
  OpsgenieCreateAlertSubActionParams,
  OpsgenieCloseAlertParams,
  OpsgenieCreateAlertParams,
} from './opsgenie';

export type ServiceNowActionParams = ServiceNowITSMActionParams | ServiceNowSIRActionParams;

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
  actions.registerSubActionConnectorType(getTinesConnectorType());
  actions.registerSubActionConnectorType(getOpenAIConnectorType());
  actions.registerSubActionConnectorType(getBedrockConnectorType());
  actions.registerSubActionConnectorType(getGeminiConnectorType());
  actions.registerSubActionConnectorType(getD3SecurityConnectorType());
  actions.registerSubActionConnectorType(getResilientConnectorType());
  actions.registerSubActionConnectorType(getTheHiveConnectorType());

  if (experimentalFeatures.sentinelOneConnectorOn) {
    actions.registerSubActionConnectorType(getSentinelOneConnectorType());
  }
  if (experimentalFeatures.crowdstrikeConnectorOn) {
    actions.registerSubActionConnectorType(getCrowdstrikeConnectorType(experimentalFeatures));
  }
  if (!experimentalFeatures.inferenceConnectorOff) {
    actions.registerSubActionConnectorType(getInferenceConnectorType());
  }
  if (experimentalFeatures.microsoftDefenderEndpointOn) {
    actions.registerSubActionConnectorType(getMicrosoftDefenderEndpointConnectorType());
  }
}
