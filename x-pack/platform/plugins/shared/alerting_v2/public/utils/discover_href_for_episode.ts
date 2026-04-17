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
import moment from 'moment';

/** Same window as Observability alert details “View in Discover” (+-15 minutes). */
export const DISCOVER_CONTEXT_HALF_WINDOW_MINUTES = 15;

/**
 * Absolute ISO time range centered on an episode / alert timestamp for opening Discover.
 */
export function getDiscoverTimeRangeAroundTimestamp(
  isoTimestamp: string | undefined
): TimeRange | undefined {
  if (!isoTimestamp?.trim() || Number.isNaN(Date.parse(isoTimestamp))) {
    return undefined;
  }
  const start = moment(isoTimestamp);
  return {
    from: start.clone().subtract(DISCOVER_CONTEXT_HALF_WINDOW_MINUTES, 'minutes').toISOString(),
    to: start.clone().add(DISCOVER_CONTEXT_HALF_WINDOW_MINUTES, 'minutes').toISOString(),
  };
}

export function getDiscoverHrefForRuleQuery({
  share,
  capabilities,
  uiSettings,
  timeRange,
  ruleEsql,
}: {
  share: SharePluginStart;
  capabilities: Capabilities;
  uiSettings: IUiSettingsClient;
  timeRange: TimeRange;
  ruleEsql: string | undefined;
}): string | undefined {
  const trimmed = ruleEsql?.trim();
  if (!trimmed) {
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
    query: { esql: trimmed },
  });
}

/**
 * Discover URL for a rule’s ES|QL in a ±30m window around an episode row timestamp.
 */
export function getDiscoverHrefForRuleAndEpisodeTimestamp({
  share,
  capabilities,
  uiSettings,
  ruleEsql,
  episodeIsoTimestamp,
}: {
  share: SharePluginStart;
  capabilities: Capabilities;
  uiSettings: IUiSettingsClient;
  ruleEsql: string | undefined;
  episodeIsoTimestamp: string | undefined;
}): string | undefined {
  const timeRange = getDiscoverTimeRangeAroundTimestamp(episodeIsoTimestamp);
  if (!timeRange) {
    return undefined;
  }
  return getDiscoverHrefForRuleQuery({
    share,
    capabilities,
    uiSettings,
    timeRange,
    ruleEsql,
  });
}
