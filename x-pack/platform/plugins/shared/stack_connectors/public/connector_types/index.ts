/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ValidatedEmail, ValidateEmailAddressesOptions } from '@kbn/actions-plugin/common';
import { TriggersAndActionsUIPublicPluginSetup } from '@kbn/triggers-actions-ui-plugin/public';
import { getMicrosoftDefenderEndpointConnectorType } from './microsoft_defender_endpoint';
import { getCasesWebhookConnectorType } from './cases_webhook';
import { getEmailConnectorType } from './email';
import { getIndexConnectorType } from './es_index';
import { getJiraConnectorType } from './jira';
import { getOpenAIConnectorType } from './openai';
import { getBedrockConnectorType } from './bedrock';
import { getGeminiConnectorType } from './gemini';
import { getInferenceConnectorType } from './inference';
import { getOpsgenieConnectorType } from './opsgenie';
import { getPagerDutyConnectorType } from './pagerduty';
import { getResilientConnectorType } from './resilient';
import { getServerLogConnectorType } from './server_log';
import { getServiceNowITOMConnectorType } from './servicenow_itom';
import { getServiceNowITSMConnectorType } from './servicenow_itsm';
import { getServiceNowSIRConnectorType } from './servicenow_sir';
import { getSlackWebhookConnectorType } from './slack';
import { getSlackApiConnectorType } from './slack_api';
import { getSwimlaneConnectorType } from './swimlane';
import { getTeamsConnectorType } from './teams';
import { getTinesConnectorType } from './tines';
import { getTorqConnectorType } from './torq';
import { getWebhookConnectorType } from './webhook';
import { getXmattersConnectorType } from './xmatters';
import { getD3SecurityConnectorType } from './d3security';
import { ExperimentalFeaturesService } from '../common/experimental_features_service';
import { getSentinelOneConnectorType } from './sentinelone';
import { getTheHiveConnectorType } from './thehive';
import { getCrowdStrikeConnectorType } from './crowdstrike';

export interface RegistrationServices {
  validateEmailAddresses: (
    addresses: string[],
    options?: ValidateEmailAddressesOptions
  ) => ValidatedEmail[];
}

export function registerConnectorTypes({
  connectorTypeRegistry,
  services,
}: {
  connectorTypeRegistry: TriggersAndActionsUIPublicPluginSetup['actionTypeRegistry'];
  services: RegistrationServices;
}) {
  connectorTypeRegistry.register(getServerLogConnectorType());
  connectorTypeRegistry.register(getSlackWebhookConnectorType());
  connectorTypeRegistry.register(getSlackApiConnectorType());
  connectorTypeRegistry.register(getEmailConnectorType(services));
  connectorTypeRegistry.register(getIndexConnectorType());
  connectorTypeRegistry.register(getPagerDutyConnectorType());
  connectorTypeRegistry.register(getSwimlaneConnectorType());
  connectorTypeRegistry.register(getCasesWebhookConnectorType());
  connectorTypeRegistry.register(getWebhookConnectorType());
  connectorTypeRegistry.register(getXmattersConnectorType());
  connectorTypeRegistry.register(getServiceNowITSMConnectorType());
  connectorTypeRegistry.register(getServiceNowITOMConnectorType());
  connectorTypeRegistry.register(getServiceNowSIRConnectorType());
  connectorTypeRegistry.register(getJiraConnectorType());
  connectorTypeRegistry.register(getResilientConnectorType());
  connectorTypeRegistry.register(getOpsgenieConnectorType());
  connectorTypeRegistry.register(getOpenAIConnectorType());
  connectorTypeRegistry.register(getBedrockConnectorType());
  connectorTypeRegistry.register(getGeminiConnectorType());
  connectorTypeRegistry.register(getTeamsConnectorType());
  connectorTypeRegistry.register(getTorqConnectorType());
  connectorTypeRegistry.register(getTinesConnectorType());
  connectorTypeRegistry.register(getD3SecurityConnectorType());
  connectorTypeRegistry.register(getTheHiveConnectorType());

  if (ExperimentalFeaturesService.get().sentinelOneConnectorOn) {
    connectorTypeRegistry.register(getSentinelOneConnectorType());
  }
  if (ExperimentalFeaturesService.get().crowdstrikeConnectorOn) {
    connectorTypeRegistry.register(getCrowdStrikeConnectorType());
  }
  if (!ExperimentalFeaturesService.get().inferenceConnectorOff) {
    connectorTypeRegistry.register(getInferenceConnectorType());
  }
  if (ExperimentalFeaturesService.get().microsoftDefenderEndpointOn) {
    connectorTypeRegistry.register(getMicrosoftDefenderEndpointConnectorType());
  }
}
