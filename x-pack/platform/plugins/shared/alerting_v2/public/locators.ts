/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorDefinition, KibanaLocation } from '@kbn/share-plugin/public';
import {
  ALERTING_V2_ACTION_POLICIES_LOCATOR,
  ALERTING_V2_EPISODES_LOCATOR,
  ALERTING_V2_EXECUTION_HISTORY_LOCATOR,
  ALERTING_V2_RULE_LIBRARY_LOCATOR,
  ALERTING_V2_RULES_LOCATOR,
} from '@kbn/alerting-v2-constants';
import type { AlertingV2LocatorHost } from './locator_host';

export type { AlertingV2HostApp, AlertingV2LocatorHost } from './locator_host';
export { createAlertingV2HostApp, MANAGEMENT_HOST } from './locator_host';

// Path builders (and @kbn/rison) live in locator_get_location and are loaded on first use
// so they stay out of the alertingVTwo page-load bundle.

export interface AlertingV2RulesLocatorParams extends SerializableRecord {
  ruleId?: string;
  page?: 'list' | 'details' | 'sequence_create';
  templateId?: string;
  host?: AlertingV2LocatorHost;
}

export class AlertingV2RulesLocatorDefinition
  implements LocatorDefinition<AlertingV2RulesLocatorParams>
{
  public readonly id = ALERTING_V2_RULES_LOCATOR;

  public readonly getLocation = async (
    params: AlertingV2RulesLocatorParams
  ): Promise<KibanaLocation> => {
    const { getRulesLocation } = await import('./locator_get_location');
    return getRulesLocation(params);
  };
}

export interface AlertingV2RuleLibraryLocatorParams extends SerializableRecord {
  templateId?: string;
  host?: AlertingV2LocatorHost;
}

export class AlertingV2RuleLibraryLocatorDefinition
  implements LocatorDefinition<AlertingV2RuleLibraryLocatorParams>
{
  public readonly id = ALERTING_V2_RULE_LIBRARY_LOCATOR;

  public readonly getLocation = async (
    params: AlertingV2RuleLibraryLocatorParams
  ): Promise<KibanaLocation> => {
    const { getRuleLibraryLocation } = await import('./locator_get_location');
    return getRuleLibraryLocation(params);
  };
}

export interface AlertingV2EpisodesLocatorParams extends SerializableRecord {
  episodeId?: string;
  filters?: {
    ruleId?: string;
    groupHash?: string;
    status?: string;
    groupingValues?: Record<string, string | null>;
  };
  timeRange?: { from: string; to: string };
  host?: AlertingV2LocatorHost;
}

export class AlertingV2EpisodesLocatorDefinition
  implements LocatorDefinition<AlertingV2EpisodesLocatorParams>
{
  public readonly id = ALERTING_V2_EPISODES_LOCATOR;

  public readonly getLocation = async (
    params: AlertingV2EpisodesLocatorParams
  ): Promise<KibanaLocation> => {
    const { getEpisodesLocation } = await import('./locator_get_location');
    return getEpisodesLocation(params);
  };
}

export interface AlertingV2ActionPoliciesLocatorParams extends SerializableRecord {
  page?: 'list' | 'create' | 'edit';
  actionPolicyId?: string;
  host?: AlertingV2LocatorHost;
}

export class AlertingV2ActionPoliciesLocatorDefinition
  implements LocatorDefinition<AlertingV2ActionPoliciesLocatorParams>
{
  public readonly id = ALERTING_V2_ACTION_POLICIES_LOCATOR;

  public readonly getLocation = async (
    params: AlertingV2ActionPoliciesLocatorParams
  ): Promise<KibanaLocation> => {
    const { getActionPoliciesLocation } = await import('./locator_get_location');
    return getActionPoliciesLocation(params);
  };
}

export interface AlertingV2ExecutionHistoryLocatorParams extends SerializableRecord {
  host?: AlertingV2LocatorHost;
}

export class AlertingV2ExecutionHistoryLocatorDefinition
  implements LocatorDefinition<AlertingV2ExecutionHistoryLocatorParams>
{
  public readonly id = ALERTING_V2_EXECUTION_HISTORY_LOCATOR;

  public readonly getLocation = async (
    params: AlertingV2ExecutionHistoryLocatorParams
  ): Promise<KibanaLocation> => {
    const { getExecutionHistoryLocation } = await import('./locator_get_location');
    return getExecutionHistoryLocation(params);
  };
}
