/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities, IUiSettingsClient } from '@kbn/core/public';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { TimeRange } from '@kbn/es-query';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import type { SharePluginStart } from '@kbn/share-plugin/public';

const ALERT_EVENTS_INDEX = '.rule-events';

/**
 * Escapes a rule id for safe use as an ES|QL string literal. Only backslash and
 * double-quote need escaping — ES|QL doesn't support arbitrary interpolation.
 */
function escapeEsqlString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export interface BuildRuleEventsEsqlOptions {
  ruleIds: string[];
}

/**
 * Builds the ES|QL used by the `Explore in Discover` link on the alerts-over-time chart.
 * The query is intentionally narrow: it filters the `.rule-events` data stream to the
 * requested rules and to the two statuses that feed the summary counts.
 */
export function buildRuleEventsEsql({ ruleIds }: BuildRuleEventsEsqlOptions): string | undefined {
  if (ruleIds.length === 0) {
    return undefined;
  }
  const idList = ruleIds.map((id) => `"${escapeEsqlString(id)}"`).join(', ');
  return [
    `FROM ${ALERT_EVENTS_INDEX}`,
    `| WHERE type == "alert"`,
    `    AND status IN ("breached", "recovered")`,
    `    AND \`rule.id\` IN (${idList})`,
    `| SORT @timestamp DESC`,
  ].join('\n');
}

export interface GetDiscoverHrefForRuleEventsOptions {
  share: SharePluginStart;
  capabilities: Capabilities;
  uiSettings: IUiSettingsClient;
  ruleIds: string[];
  timeRange: TimeRange;
}

/**
 * Returns a Discover URL filtered to `.rule-events` for the given rule ids and
 * time range. Returns `undefined` when ES|QL or Discover are unavailable, when
 * no rule ids were provided, or when the Discover locator isn't registered.
 */
export function getDiscoverHrefForRuleEvents({
  share,
  capabilities,
  uiSettings,
  ruleIds,
  timeRange,
}: GetDiscoverHrefForRuleEventsOptions): string | undefined {
  const esql = buildRuleEventsEsql({ ruleIds });
  if (!esql) {
    return undefined;
  }
  if (!uiSettings.get(ENABLE_ESQL)) {
    return undefined;
  }
  if (!capabilities.discover_v2?.show) {
    return undefined;
  }
  const locator = share.url.locators.get(DISCOVER_APP_LOCATOR);
  if (!locator) {
    return undefined;
  }
  return locator.getRedirectUrl({
    timeRange,
    query: { esql },
  });
}
