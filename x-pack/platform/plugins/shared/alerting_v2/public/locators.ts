/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode as encodeRison } from '@kbn/rison';
import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorDefinition, KibanaLocation } from '@kbn/share-plugin/public';
import {
  ALERTING_V2_SECTION_ID,
  ALERTING_V2_RULES_APP_ID,
  ALERTING_V2_RULE_LIBRARY_APP_ID,
  ALERTING_V2_ACTION_POLICIES_APP_ID,
  ALERTING_V2_EPISODES_APP_ID,
  ALERTING_V2_EXECUTION_HISTORY_APP_ID,
  ALERTING_V2_RULES_LOCATOR,
  ALERTING_V2_RULE_LIBRARY_LOCATOR,
  ALERTING_V2_EPISODES_LOCATOR,
  ALERTING_V2_ACTION_POLICIES_LOCATOR,
  ALERTING_V2_EXECUTION_HISTORY_LOCATOR,
} from '@kbn/alerting-v2-constants';

export interface AlertingV2LocatorHost extends SerializableRecord {
  app: string;
  basePath: string;
}

export interface AlertingV2HostApp {
  rules: AlertingV2LocatorHost;
  ruleLibrary: AlertingV2LocatorHost;
  episodes: AlertingV2LocatorHost;
  actionPolicies: AlertingV2LocatorHost;
  executionHistory: AlertingV2LocatorHost;
}

const MANAGEMENT_APP_ID = 'management';

export const MANAGEMENT_HOST: AlertingV2HostApp = {
  rules: {
    app: MANAGEMENT_APP_ID,
    basePath: `/${ALERTING_V2_SECTION_ID}/${ALERTING_V2_RULES_APP_ID}`,
  },
  ruleLibrary: {
    app: MANAGEMENT_APP_ID,
    basePath: `/${ALERTING_V2_SECTION_ID}/${ALERTING_V2_RULE_LIBRARY_APP_ID}`,
  },
  episodes: {
    app: MANAGEMENT_APP_ID,
    basePath: `/${ALERTING_V2_SECTION_ID}/${ALERTING_V2_EPISODES_APP_ID}`,
  },
  actionPolicies: {
    app: MANAGEMENT_APP_ID,
    basePath: `/${ALERTING_V2_SECTION_ID}/${ALERTING_V2_ACTION_POLICIES_APP_ID}`,
  },
  executionHistory: {
    app: MANAGEMENT_APP_ID,
    basePath: `/${ALERTING_V2_SECTION_ID}/${ALERTING_V2_EXECUTION_HISTORY_APP_ID}`,
  },
};

const pageHost = (
  params: { host?: AlertingV2LocatorHost },
  fallback: AlertingV2LocatorHost
): AlertingV2LocatorHost => params.host ?? fallback;

// --- Rules locator ---

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
    const { app, basePath } = pageHost(params, MANAGEMENT_HOST.rules);

    if (params.page === 'sequence_create') {
      return { app, path: `${basePath}/sequence/create`, state: {} };
    }
    if (params.ruleId) {
      return { app, path: `${basePath}/${encodeURIComponent(params.ruleId)}`, state: {} };
    }
    if (params.templateId) {
      return {
        app,
        path: `${basePath}?templateId=${encodeURIComponent(params.templateId)}`,
        state: {},
      };
    }
    return { app, path: basePath, state: {} };
  };
}

// --- Rule library locator ---

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
    const { app, basePath } = pageHost(params, MANAGEMENT_HOST.ruleLibrary);

    if (params.templateId) {
      return {
        app,
        path: `${basePath}?templateId=${encodeURIComponent(params.templateId)}`,
        state: {},
      };
    }
    return { app, path: basePath, state: {} };
  };
}

// --- Episodes locator ---

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
    const { app, basePath } = pageHost(params, MANAGEMENT_HOST.episodes);

    if (params.episodeId) {
      return { app, path: `${basePath}/${encodeURIComponent(params.episodeId)}`, state: {} };
    }

    if (params.filters || params.timeRange) {
      const episodesList = Object.fromEntries(
        Object.entries({
          ruleId: params.filters?.ruleId,
          groupHash: params.filters?.groupHash,
          status: params.filters?.status,
          groupingValues:
            params.filters?.groupingValues && Object.keys(params.filters.groupingValues).length > 0
              ? params.filters.groupingValues
              : undefined,
          timeFrom: params.timeRange?.from,
          timeTo: params.timeRange?.to,
        }).filter(([, value]) => value != null)
      );

      if (Object.keys(episodesList).length > 0) {
        const search = new URLSearchParams();
        search.set('_a', encodeRison({ episodesList }));
        return { app, path: `${basePath}?${search.toString()}`, state: {} };
      }
    }

    return { app, path: basePath, state: {} };
  };
}

// --- Action policies locator ---

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
    const { app, basePath } = pageHost(params, MANAGEMENT_HOST.actionPolicies);

    if (params.page === 'create') {
      return { app, path: `${basePath}/create`, state: {} };
    }
    if (params.page === 'edit' && params.actionPolicyId) {
      return {
        app,
        path: `${basePath}/edit/${encodeURIComponent(params.actionPolicyId)}`,
        state: {},
      };
    }
    return { app, path: basePath, state: {} };
  };
}

// --- Execution history locator ---

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
    const { app, basePath } = pageHost(params, MANAGEMENT_HOST.executionHistory);
    return { app, path: basePath, state: {} };
  };
}

export const createAlertingV2HostApp = (
  appId: string,
  pageBasePaths: {
    rules: string;
    ruleLibrary: string;
    episodes: string;
    actionPolicies: string;
    executionHistory: string;
  }
): AlertingV2HostApp => ({
  rules: { app: appId, basePath: pageBasePaths.rules },
  ruleLibrary: { app: appId, basePath: pageBasePaths.ruleLibrary },
  episodes: { app: appId, basePath: pageBasePaths.episodes },
  actionPolicies: { app: appId, basePath: pageBasePaths.actionPolicies },
  executionHistory: { app: appId, basePath: pageBasePaths.executionHistory },
});
