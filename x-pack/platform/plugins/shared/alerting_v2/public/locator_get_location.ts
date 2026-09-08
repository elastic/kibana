/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode as encodeRison } from '@kbn/rison';
import type { KibanaLocation } from '@kbn/share-plugin/public';
import { MANAGEMENT_HOST, pageHost } from './locator_host';
import type {
  AlertingV2ActionPoliciesLocatorParams,
  AlertingV2EpisodesLocatorParams,
  AlertingV2ExecutionHistoryLocatorParams,
  AlertingV2RuleLibraryLocatorParams,
  AlertingV2RulesLocatorParams,
} from './locators';

export const getRulesLocation = (params: AlertingV2RulesLocatorParams): KibanaLocation => {
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

export const getRuleLibraryLocation = (
  params: AlertingV2RuleLibraryLocatorParams
): KibanaLocation => {
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

export const getEpisodesLocation = (params: AlertingV2EpisodesLocatorParams): KibanaLocation => {
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

export const getActionPoliciesLocation = (
  params: AlertingV2ActionPoliciesLocatorParams
): KibanaLocation => {
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

export const getExecutionHistoryLocation = (
  params: AlertingV2ExecutionHistoryLocatorParams
): KibanaLocation => {
  const { app, basePath } = pageHost(params, MANAGEMENT_HOST.executionHistory);
  return { app, path: basePath, state: {} };
};
