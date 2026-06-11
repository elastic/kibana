/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { IUiSettingsClient } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { RulesClientApi } from '@kbn/alerting-v2-plugin/server';
import { DualCleanupRulesAdapter } from '../streams/ki/knowledge_indicator_client/rules/dual_cleanup_rules_adapter';
import type { IRulesManagementClient } from '../streams/ki/knowledge_indicator_client/rules/rules_management_client';
import { V1RulesAdapter } from '../streams/ki/knowledge_indicator_client/rules/v1_rules_adapter';
import {
  V2RulesAdapter,
  V2RulesNotInstalledAdapter,
} from '../streams/ki/knowledge_indicator_client/rules/v2_rules_adapter';
import type { StreamsPluginStartDependencies } from '../../types';
import {
  isSignificantEventsAlertingV2Active,
  logAlertingV2PluginUnavailable,
  readSignificantEventsAlertingV2UiEnabled,
} from './significant_events_alerting_v2';

export interface SignificantEventsAlertingV2State {
  alertingV2UiEnabled: boolean;
  alertingV2Active: boolean;
  alertingV2RulesClient?: RulesClientApi;
}

export async function resolveSignificantEventsAlertingV2State({
  uiSettingsClient,
  alertingVTwo,
  request,
  spaceId = DEFAULT_SPACE_ID,
  logger,
}: {
  uiSettingsClient: IUiSettingsClient;
  alertingVTwo?: StreamsPluginStartDependencies['alertingVTwo'];
  request: KibanaRequest;
  spaceId?: string;
  logger: Logger;
}): Promise<SignificantEventsAlertingV2State> {
  const alertingV2UiEnabled = await readSignificantEventsAlertingV2UiEnabled(
    uiSettingsClient,
    logger
  );
  const alertingV2RulesClient = alertingVTwo
    ? await alertingVTwo.getRulesClientWithRequestInSpace(request, spaceId)
    : undefined;

  if (alertingV2UiEnabled && !alertingV2RulesClient) {
    logAlertingV2PluginUnavailable(logger);
  }

  return {
    alertingV2UiEnabled,
    alertingV2Active: isSignificantEventsAlertingV2Active(
      alertingV2UiEnabled,
      alertingV2RulesClient
    ),
    alertingV2RulesClient,
  };
}

export async function readSignificantEventsAlertingV2ActiveFromClients({
  uiSettingsClient,
  alertingV2RulesClient,
  logger,
}: {
  uiSettingsClient: IUiSettingsClient;
  alertingV2RulesClient?: RulesClientApi;
  logger: Logger;
}): Promise<{ alertingV2UiEnabled: boolean; alertingV2Active: boolean }> {
  const alertingV2UiEnabled = await readSignificantEventsAlertingV2UiEnabled(
    uiSettingsClient,
    logger
  );

  if (alertingV2UiEnabled && !alertingV2RulesClient) {
    logAlertingV2PluginUnavailable(logger);
  }

  return {
    alertingV2UiEnabled,
    alertingV2Active: isSignificantEventsAlertingV2Active(
      alertingV2UiEnabled,
      alertingV2RulesClient
    ),
  };
}

export function createDualCleanupRulesClient({
  alertingV2Active,
  alertingRulesClient,
  alertingV2RulesClient,
  logger,
}: {
  alertingV2Active: boolean;
  alertingRulesClient: RulesClient;
  alertingV2RulesClient?: RulesClientApi;
  logger: Logger;
}): IRulesManagementClient {
  const v1Adapter = new V1RulesAdapter(alertingRulesClient);
  const v2Client = alertingV2RulesClient
    ? new V2RulesAdapter(alertingV2RulesClient)
    : new V2RulesNotInstalledAdapter(logger);

  return alertingV2Active
    ? new DualCleanupRulesAdapter(v2Client, v1Adapter, logger)
    : new DualCleanupRulesAdapter(v1Adapter, v2Client, logger);
}
