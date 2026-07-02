import type { Logger } from '@kbn/core/server';
import type { ISearchStrategy, PluginStart } from '@kbn/data-plugin/server';
import type { AlertingServerStart } from '@kbn/alerting-plugin/server';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { RuleRegistrySearchRequest, RuleRegistrySearchResponse } from '../../common';
export declare const EMPTY_RESPONSE: RuleRegistrySearchResponse;
export declare const RULE_SEARCH_STRATEGY_NAME = "privateRuleRegistryAlertsSearchStrategy";
export declare const ruleRegistrySearchStrategyProvider: (data: PluginStart, alerting: AlertingServerStart, logger: Logger, security?: SecurityPluginSetup, spaces?: SpacesPluginStart) => ISearchStrategy<RuleRegistrySearchRequest, RuleRegistrySearchResponse>;
