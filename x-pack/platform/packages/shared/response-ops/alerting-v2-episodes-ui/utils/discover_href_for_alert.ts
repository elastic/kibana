/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities, IUiSettingsClient } from '@kbn/core/public';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { TimeRange } from '@kbn/es-query';
import { ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import { ENABLE_ESQL, escapeStringValue } from '@kbn/esql-utils';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import moment from 'moment';

/** Same window as Observability alert details “View in Discover” (+-15 minutes). */
export const DISCOVER_CONTEXT_HALF_WINDOW_MINUTES = 15;

/**
 * Absolute ISO time range centered on an alert timestamp for opening Discover.
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

export interface DiscoverAvailabilityArgs {
  share: SharePluginStart;
  capabilities: Capabilities;
  uiSettings: IUiSettingsClient;
}

/** True when the current user can open an ES|QL query in Discover. */
export function canOpenDiscover({
  share,
  capabilities,
  uiSettings,
}: DiscoverAvailabilityArgs): boolean {
  if (!uiSettings.get(ENABLE_ESQL)) {
    return false;
  }
  if (!capabilities.discover_v2?.show) {
    return false;
  }
  return Boolean(share.url.locators.get(DISCOVER_APP_LOCATOR));
}

export function getDiscoverHrefForRuleQuery({
  share,
  capabilities,
  uiSettings,
  timeRange,
  ruleEsql,
}: DiscoverAvailabilityArgs & {
  timeRange: TimeRange;
  ruleEsql: string | undefined;
}): string | undefined {
  const trimmed = ruleEsql?.trim();
  if (!trimmed || !canOpenDiscover({ share, capabilities, uiSettings })) {
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

export function getDiscoverHrefForAlertEventsHistory({
  share,
  capabilities,
  uiSettings,
  episodeId,
  episodeStart,
  spaceId,
}: {
  share: SharePluginStart;
  capabilities: Capabilities;
  uiSettings: IUiSettingsClient;
  episodeId: string;
  episodeStart: string;
  spaceId: string;
}): string | undefined {
  const query = `FROM ${ALERT_EVENTS_DATA_STREAM}
| WHERE space_id == ${escapeStringValue(spaceId)}
  AND type == "alert"
  AND episode.id == ${escapeStringValue(episodeId)}
| SORT @timestamp ASC`;

  return getDiscoverHrefForRuleQuery({
    share,
    capabilities,
    uiSettings,
    timeRange: { from: episodeStart, to: 'now' },
    ruleEsql: query,
  });
}

/**
 * Discover URL for a rule’s ES|QL in a ±30m window around an alert row timestamp.
 */
export function getDiscoverHrefForRuleAndAlertTimestamp({
  share,
  capabilities,
  uiSettings,
  ruleEsql,
  alertIsoTimestamp,
}: {
  share: SharePluginStart;
  capabilities: Capabilities;
  uiSettings: IUiSettingsClient;
  ruleEsql: string | undefined;
  alertIsoTimestamp: string | undefined;
}): string | undefined {
  const timeRange = getDiscoverTimeRangeAroundTimestamp(alertIsoTimestamp);
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
