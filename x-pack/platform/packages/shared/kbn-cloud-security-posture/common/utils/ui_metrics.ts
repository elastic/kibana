/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UiCounterMetricType } from '@kbn/analytics';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';

export const APP_NAME = 'cloud-security';

export const MISCONFIGURATION_INSIGHT = 'misconfiguration-insight-v2' as const;
export const VULNERABILITIES_INSIGHT = 'vulnerabilities-insight-v2' as const;
export const MISCONFIGURATION_INSIGHT_HOST_DETAILS =
  `${MISCONFIGURATION_INSIGHT}-host-details` as const;
export const MISCONFIGURATION_INSIGHT_USER_DETAILS =
  `${MISCONFIGURATION_INSIGHT}-user-details` as const;
export const MISCONFIGURATION_INSIGHT_HOST_ENTITY_OVERVIEW =
  `${MISCONFIGURATION_INSIGHT}-host-entity-overview` as const;
export const MISCONFIGURATION_INSIGHT_USER_ENTITY_OVERVIEW =
  `${MISCONFIGURATION_INSIGHT}-user-entity-overview` as const;
export const VULNERABILITIES_INSIGHT_HOST_DETAILS =
  `${VULNERABILITIES_INSIGHT}-host-details` as const;
export const VULNERABILITIES_INSIGHT_HOST_ENTITY_OVERVIEW =
  `${VULNERABILITIES_INSIGHT}-host-entity-overview` as const;

export const ENTITY_FLYOUT_WITH_MISCONFIGURATION_VISIT =
  'entity-flyout-with-misconfiguration-visits' as const;
export const ENTITY_FLYOUT_WITH_VULNERABILITY_PREVIEW =
  'entity-flyout-with-vulnerability-preview-visits' as const;
export const ENTITY_FLYOUT_EXPAND_MISCONFIGURATION_VIEW_VISITS =
  'entity-flyout-expand-misconfiguration-view-visits' as const;
export const ENTITY_FLYOUT_EXPAND_VULNERABILITY_VIEW_VISITS =
  'entity-flyout-expand-vulnerability-view-visits' as const;
export const NAV_TO_FINDINGS_BY_HOST_NAME_FRPOM_ENTITY_FLYOUT =
  'nav-to-findings-by-host-name-from-entity-flyout' as const;
export const NAV_TO_FINDINGS_BY_RULE_NAME_FRPOM_ENTITY_FLYOUT =
  'nav-to-findings-by-rule-name-from-entity-flyout' as const;
export const CREATE_DETECTION_RULE_FROM_FLYOUT = 'create-detection-rule-from-flyout' as const;
export const CREATE_DETECTION_FROM_TABLE_ROW_ACTION =
  'create-detection-from-table-row-action' as const;
export const VULNERABILITIES_FLYOUT_VISITS = 'vulnerabilities-flyout-visits' as const;
export const OPEN_FINDINGS_FLYOUT = 'open-findings-flyout' as const;
export const GROUP_BY_CLICK = 'group-by-click' as const;
export const CHANGE_RULE_STATE = 'change-rule-state' as const;

export const GRAPH_PREVIEW = 'graph-preview' as const;
export const GRAPH_INVESTIGATION = 'graph-investigation' as const;

export const ASSET_INVENTORY_EXPAND_FLYOUT_SUCCESS =
  'asset-inventory-expand-flyout-success' as const;
export const ASSET_INVENTORY_EXPAND_FLYOUT_ERROR = 'asset-inventory-expand-flyout-error' as const;
export const UNIVERSAL_ENTITY_FLYOUT_OPENED = 'universal-entity-flyout-opened' as const;

export type CloudSecurityUiCounters =
  | typeof ENTITY_FLYOUT_WITH_MISCONFIGURATION_VISIT
  | typeof ENTITY_FLYOUT_WITH_VULNERABILITY_PREVIEW
  | typeof ENTITY_FLYOUT_EXPAND_MISCONFIGURATION_VIEW_VISITS
  | typeof ENTITY_FLYOUT_EXPAND_VULNERABILITY_VIEW_VISITS
  | typeof NAV_TO_FINDINGS_BY_HOST_NAME_FRPOM_ENTITY_FLYOUT
  | typeof NAV_TO_FINDINGS_BY_RULE_NAME_FRPOM_ENTITY_FLYOUT
  | typeof VULNERABILITIES_FLYOUT_VISITS
  | typeof OPEN_FINDINGS_FLYOUT
  | typeof CREATE_DETECTION_RULE_FROM_FLYOUT
  | typeof CREATE_DETECTION_FROM_TABLE_ROW_ACTION
  | typeof GROUP_BY_CLICK
  | typeof CHANGE_RULE_STATE
  | typeof MISCONFIGURATION_INSIGHT_HOST_DETAILS
  | typeof MISCONFIGURATION_INSIGHT_USER_DETAILS
  | typeof MISCONFIGURATION_INSIGHT_HOST_ENTITY_OVERVIEW
  | typeof MISCONFIGURATION_INSIGHT_USER_ENTITY_OVERVIEW
  | typeof VULNERABILITIES_INSIGHT_HOST_DETAILS
  | typeof VULNERABILITIES_INSIGHT_HOST_ENTITY_OVERVIEW
  | typeof GRAPH_PREVIEW
  | typeof GRAPH_INVESTIGATION
  | typeof ASSET_INVENTORY_EXPAND_FLYOUT_SUCCESS
  | typeof ASSET_INVENTORY_EXPAND_FLYOUT_ERROR
  | typeof UNIVERSAL_ENTITY_FLYOUT_OPENED;

export class UiMetricService {
  private usageCollection: UsageCollectionSetup | undefined;

  public setup(usageCollection: UsageCollectionSetup) {
    this.usageCollection = usageCollection;
  }

  private track(metricType: UiCounterMetricType, eventName: CloudSecurityUiCounters) {
    if (!this.usageCollection) {
      // Usage collection might be disabled in Kibana config.
      return;
    }
    return this.usageCollection.reportUiCounter(APP_NAME, metricType, eventName);
  }

  public trackUiMetric(metricType: UiCounterMetricType, eventName: CloudSecurityUiCounters) {
    return this.track(metricType, eventName);
  }
}

export const uiMetricService = new UiMetricService();
