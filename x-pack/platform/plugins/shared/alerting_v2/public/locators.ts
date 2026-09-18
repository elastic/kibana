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

export interface AlertingV2RulesLocatorParams extends SerializableRecord {
  ruleId?: string;
  page?: 'list' | 'details' | 'sequence_create';
  templateId?: string;
  host?: AlertingV2LocatorHost;
}

export const AlertingV2RulesLocatorDefinition: LocatorDefinition<AlertingV2RulesLocatorParams> = {
  id: ALERTING_V2_RULES_LOCATOR,
  getLocation: async (params: AlertingV2RulesLocatorParams): Promise<KibanaLocation> => {
    const { getRulesLocation } = await import('./locator_get_location');
    return getRulesLocation(params);
  },
};

export interface AlertingV2RuleLibraryLocatorParams extends SerializableRecord {
  templateId?: string;
  host?: AlertingV2LocatorHost;
}

export const AlertingV2RuleLibraryLocatorDefinition: LocatorDefinition<AlertingV2RuleLibraryLocatorParams> =
  {
    id: ALERTING_V2_RULE_LIBRARY_LOCATOR,
    getLocation: async (params: AlertingV2RuleLibraryLocatorParams): Promise<KibanaLocation> => {
      const { getRuleLibraryLocation } = await import('./locator_get_location');
      return getRuleLibraryLocation(params);
    },
  };

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

export const AlertingV2EpisodesLocatorDefinition: LocatorDefinition<AlertingV2EpisodesLocatorParams> =
  {
    id: ALERTING_V2_EPISODES_LOCATOR,
    getLocation: async (params: AlertingV2EpisodesLocatorParams): Promise<KibanaLocation> => {
      const { getEpisodesLocation } = await import('./locator_get_location');
      return getEpisodesLocation(params);
    },
  };

export interface AlertingV2ActionPoliciesLocatorParams extends SerializableRecord {
  page?: 'list' | 'create' | 'edit';
  actionPolicyId?: string;
  host?: AlertingV2LocatorHost;
}

export const AlertingV2ActionPoliciesLocatorDefinition: LocatorDefinition<AlertingV2ActionPoliciesLocatorParams> =
  {
    id: ALERTING_V2_ACTION_POLICIES_LOCATOR,
    getLocation: async (params: AlertingV2ActionPoliciesLocatorParams): Promise<KibanaLocation> => {
      const { getActionPoliciesLocation } = await import('./locator_get_location');
      return getActionPoliciesLocation(params);
    },
  };

export interface AlertingV2ExecutionHistoryLocatorParams extends SerializableRecord {
  host?: AlertingV2LocatorHost;
}

export const AlertingV2ExecutionHistoryLocatorDefinition: LocatorDefinition<AlertingV2ExecutionHistoryLocatorParams> =
  {
    id: ALERTING_V2_EXECUTION_HISTORY_LOCATOR,
    getLocation: async (
      params: AlertingV2ExecutionHistoryLocatorParams
    ): Promise<KibanaLocation> => {
      const { getExecutionHistoryLocation } = await import('./locator_get_location');
      return getExecutionHistoryLocation(params);
    },
  };
