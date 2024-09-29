/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UiCounterMetricType } from '@kbn/analytics';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';

export const APP_NAME = 'cloud-security';

export const ENTITY_FLYOUT_MISCONFIGURATION_VIEW_VISITS =
  'entity-flyout-misconfiguration-view-visits';
export const NAV_TO_FINDINGS_BY_HOST_NAME_FRPOM_ENTITY_FLYOUT =
  'nav-to-findings-by-host-name-from-entity-flyout';
export const NAV_TO_FINDINGS_BY_RULE_NAME_FRPOM_ENTITY_FLYOUT =
  'nav-to-findings-by-rule-name-from-entity-flyout';
export const CREATE_DETECTION_RULE_FROM_FLYOUT = 'create-detection-rule-from-flyout';
export const CREATE_DETECTION_FROM_TABLE_ROW_ACTION = 'create-detection-from-table-row-action';
export const VULNERABILITIES_FLYOUT_VISITS = 'vulnerabilities-flyout-visits';
export const OPEN_FINDINGS_FLYOUT = 'open-findings-flyout';
export const GROUP_BY_CLICK = 'group-by-click';
export const CHANGE_RULE_STATE = 'change-rule-state';

type CloudSecurityUiCounters =
  | typeof ENTITY_FLYOUT_MISCONFIGURATION_VIEW_VISITS
  | typeof NAV_TO_FINDINGS_BY_HOST_NAME_FRPOM_ENTITY_FLYOUT
  | typeof VULNERABILITIES_FLYOUT_VISITS
  | typeof NAV_TO_FINDINGS_BY_RULE_NAME_FRPOM_ENTITY_FLYOUT
  | typeof OPEN_FINDINGS_FLYOUT
  | typeof CREATE_DETECTION_RULE_FROM_FLYOUT
  | typeof CREATE_DETECTION_FROM_TABLE_ROW_ACTION
  | typeof GROUP_BY_CLICK
  | typeof CHANGE_RULE_STATE;

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
