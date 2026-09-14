/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorPublic, SharePluginStart } from '@kbn/share-plugin/public';
import {
  ALERTING_V2_ACTION_POLICIES_LOCATOR,
  ALERTING_V2_EPISODES_LOCATOR,
  ALERTING_V2_EXECUTION_HISTORY_LOCATOR,
  ALERTING_V2_RULE_LIBRARY_LOCATOR,
  ALERTING_V2_RULES_LOCATOR,
} from '@kbn/alerting-v2-constants';
import type {
  AlertingV2ActionPoliciesLocatorParams,
  AlertingV2EpisodesLocatorParams,
  AlertingV2ExecutionHistoryLocatorParams,
  AlertingV2HostApp,
  AlertingV2LocatorHost,
  AlertingV2RuleLibraryLocatorParams,
  AlertingV2RulesLocatorParams,
} from '../locators';
import type { AlertingV2Locators } from './locator_context';

interface HostParams extends SerializableRecord {
  host?: AlertingV2LocatorHost;
}

export const getAlertingV2Locators = (share: SharePluginStart): AlertingV2Locators => ({
  rulesLocators: share.url.locators.get<AlertingV2RulesLocatorParams>(ALERTING_V2_RULES_LOCATOR)!,
  ruleLibraryLocators: share.url.locators.get<AlertingV2RuleLibraryLocatorParams>(
    ALERTING_V2_RULE_LIBRARY_LOCATOR
  )!,
  episodesLocators: share.url.locators.get<AlertingV2EpisodesLocatorParams>(
    ALERTING_V2_EPISODES_LOCATOR
  )!,
  actionPolicyLocators: share.url.locators.get<AlertingV2ActionPoliciesLocatorParams>(
    ALERTING_V2_ACTION_POLICIES_LOCATOR
  )!,
  executionHistoryLocators: share.url.locators.get<AlertingV2ExecutionHistoryLocatorParams>(
    ALERTING_V2_EXECUTION_HISTORY_LOCATOR
  )!,
});

export const bindLocatorToHost = <P extends HostParams>(
  locator: LocatorPublic<P>,
  host: AlertingV2LocatorHost
): LocatorPublic<P> => {
  const withHost = (params: P): P => ({
    ...params,
    host: params.host ?? host,
  });

  const bound = Object.create(locator) as LocatorPublic<P>;
  bound.getLocation = (params) => locator.getLocation(withHost(params));
  bound.getUrl = (params, getUrlParams) => locator.getUrl(withHost(params), getUrlParams);
  bound.getRedirectUrl = (params, options) => locator.getRedirectUrl(withHost(params), options);
  bound.navigate = (params, navigationParams) =>
    locator.navigate(withHost(params), navigationParams);
  bound.navigateSync = (params, navigationParams) =>
    locator.navigateSync(withHost(params), navigationParams);
  bound.useUrl = (params, getUrlParams, deps) =>
    locator.useUrl(withHost(params), getUrlParams, deps);
  return bound;
};

export const bindLocatorsToHost = (
  locators: AlertingV2Locators,
  hostApp: AlertingV2HostApp
): AlertingV2Locators => ({
  rulesLocators: bindLocatorToHost(locators.rulesLocators, hostApp.rules),
  ruleLibraryLocators: bindLocatorToHost(locators.ruleLibraryLocators, hostApp.ruleLibrary),
  episodesLocators: bindLocatorToHost(locators.episodesLocators, hostApp.episodes),
  actionPolicyLocators: bindLocatorToHost(locators.actionPolicyLocators, hostApp.actionPolicies),
  executionHistoryLocators: bindLocatorToHost(
    locators.executionHistoryLocators,
    hostApp.executionHistory
  ),
});
