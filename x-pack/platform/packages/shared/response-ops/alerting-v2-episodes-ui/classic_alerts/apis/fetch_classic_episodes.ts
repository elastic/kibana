/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { TimeRange } from '@kbn/es-query';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { getAlertSnoozeStateByRule } from '@kbn/response-ops-alerts-apis/apis/get_muted_alerts_instances_by_rule';
import type {
  AlertEpisode,
  EpisodesFilterState,
  EpisodesSortState,
} from '../../queries/episodes_query';
import { buildClassicAlertsQuery, buildClassicAlertsSort } from '../utils/query';
import {
  type ClassicAlertSource,
  type ClassicAlertActionContext,
  mapClassicAlertToEpisode,
  CLASSIC_ALERT_EPISODE_SOURCE_FIELDS,
} from '../utils/map_alert';
import { CLASSIC_ALERTS_LIST_PAGE_SIZE } from '../constants';
import { type BaseRacOptions, findClassicAlerts, toTimeRangeParam } from './rac_find';

export interface FetchClassicAlertsAsEpisodesOptions extends BaseRacOptions {
  pageSize: number;
  timeRange?: TimeRange | null;
  filterState?: EpisodesFilterState;
  sortState?: EpisodesSortState;
  abortSignal?: AbortSignal;
  services: { http: HttpStart };
}

/**
 * Reads classic observability + stack alerts (RBAC enforced by the RAC alerts
 * API) reshaped into the v2 `AlertEpisode` row shape, so they can be merged into
 * the v2 alerting (episodes) table.
 */
export const fetchClassicAlertsAsEpisodes = async ({
  ruleTypeIds,
  pageSize,
  timeRange,
  filterState,
  sortState,
  abortSignal,
  services: { http },
}: FetchClassicAlertsAsEpisodesOptions): Promise<AlertEpisode[]> => {
  const response = await findClassicAlerts(
    http,
    {
      rule_type_ids: ruleTypeIds,
      query: buildClassicAlertsQuery(filterState, toTimeRangeParam(timeRange)),
      sort: buildClassicAlertsSort(sortState),
      size: Math.min(pageSize, CLASSIC_ALERTS_LIST_PAGE_SIZE),
      track_total_hits: false,
      _source: [...CLASSIC_ALERT_EPISODE_SOURCE_FIELDS],
    },
    abortSignal
  );

  const episodes = response.hits.hits.flatMap((hit) =>
    hit._source && hit._index
      ? [mapClassicAlertToEpisode(hit._source as unknown as ClassicAlertSource, hit._index)]
      : []
  );

  if (episodes.length === 0) return episodes;

  return enrichWithSnoozeState(episodes, http, abortSignal);
};

const enrichWithSnoozeState = async (
  episodes: AlertEpisode[],
  http: HttpStart,
  abortSignal?: AbortSignal
): Promise<AlertEpisode[]> => {
  const ruleIds = [...new Set(episodes.map((ep) => ep['rule.id']))].filter(Boolean);
  if (ruleIds.length === 0) return episodes;

  let snoozeData: Awaited<ReturnType<typeof getAlertSnoozeStateByRule>>['data'];
  try {
    const result = await getAlertSnoozeStateByRule({ http, ruleIds, signal: abortSignal });
    snoozeData = result.data;
  } catch {
    return episodes;
  }

  const mutedByRule = new Map<string, Set<string>>();
  const snoozedByRule = new Map<string, Map<string, string | undefined>>();

  for (const rule of snoozeData) {
    mutedByRule.set(rule.id, new Set(rule.mutedAlertIds));

    const instanceMap = new Map<string, string | undefined>();
    for (const instance of rule.snoozedInstances) {
      instanceMap.set(instance.instanceId, instance.expiresAt);
    }
    snoozedByRule.set(rule.id, instanceMap);
  }

  return episodes.map((ep) => {
    const ctx = ep.source_action_context as ClassicAlertActionContext | undefined;
    if (!ctx?.instanceId) return ep;

    const ruleId = ctx.ruleId;
    const instanceId = ctx.instanceId;

    const snoozedInstances = snoozedByRule.get(ruleId);
    if (snoozedInstances?.has(instanceId)) {
      return {
        ...ep,
        last_snooze_action: ALERT_EPISODE_ACTION_TYPE.SNOOZE,
        snooze_expiry: snoozedInstances.get(instanceId) ?? null,
      };
    }

    if (mutedByRule.get(ruleId)?.has(instanceId)) {
      return {
        ...ep,
        last_snooze_action: ALERT_EPISODE_ACTION_TYPE.SNOOZE,
        snooze_expiry: null,
      };
    }

    return ep;
  });
};
