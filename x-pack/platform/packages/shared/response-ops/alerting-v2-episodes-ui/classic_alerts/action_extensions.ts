/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { bulkUpdateAlertWorkflowStatus } from '@kbn/response-ops-alerts-apis/apis/bulk_update_alert_workflow_status';
import { bulkUpdateAlertTags } from '@kbn/response-ops-alerts-apis/apis/bulk_update_alert_tags';
import { bulkUntrackAlerts } from '@kbn/response-ops-alerts-apis/apis/bulk_untrack_alerts';
import { bulkMuteAlerts } from '@kbn/response-ops-alerts-apis/apis/bulk_mute_alerts';
import { bulkUnmuteAlerts } from '@kbn/response-ops-alerts-apis/apis/bulk_unmute_alerts';
import { snoozeAlertInstance } from '@kbn/response-ops-alerts-apis/apis/snooze_alert_instance';
import { unsnoozeAlertInstance } from '@kbn/response-ops-alerts-apis/apis/unsnooze_alert_instance';
import type { HttpStart } from '@kbn/core-http-browser';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import type { AlertEpisode } from '../queries/episodes_query';
import type { EpisodeActionExtension, SourceActionResult } from '../types/episode_data_source';
import { isEpisodeSnoozed } from '../utils/is_episode_snoozed';
import type { ClassicAlertActionContext } from './utils/map_alert';

const getActionContext = (episode: {
  source_action_context?: unknown;
}): ClassicAlertActionContext => episode.source_action_context as ClassicAlertActionContext;

const groupByIndex = (episodes: AlertEpisode[]): Array<{ index: string; ids: string[] }> => {
  const groups = new Map<string, string[]>();
  for (const ep of episodes) {
    const ctx = getActionContext(ep);
    const ids = groups.get(ctx.index) ?? [];
    ids.push(ctx.alertUuid);
    groups.set(ctx.index, ids);
  }
  return [...groups.entries()].map(([index, ids]) => ({ index, ids }));
};

const groupByRule = (
  episodes: AlertEpisode[]
): Array<{ rule_id: string; alert_instance_ids: string[] }> => {
  const groups = new Map<string, string[]>();
  for (const ep of episodes) {
    const ctx = getActionContext(ep);
    if (!ctx.instanceId) continue;
    const ids = groups.get(ctx.ruleId) ?? [];
    ids.push(ctx.instanceId);
    groups.set(ctx.ruleId, ids);
  }
  return [...groups.entries()].map(([rule_id, alert_instance_ids]) => ({
    rule_id,
    alert_instance_ids,
  }));
};

const updateWorkflowStatus = async (
  episodes: AlertEpisode[],
  http: HttpStart,
  status: string
): Promise<SourceActionResult> => {
  const groups = groupByIndex(episodes);
  const results = await Promise.allSettled(
    groups.map(({ index, ids }) => bulkUpdateAlertWorkflowStatus({ http, ids, status, index }))
  );

  let succeeded = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled') {
      succeeded += groups[i].ids.length;
    } else {
      failed += groups[i].ids.length;
      errors.push(result.reason?.message ?? 'Unknown error');
    }
  }

  return { succeeded, failed, errors };
};

const updateWorkflowTags = async (
  episodes: AlertEpisode[],
  http: HttpStart,
  context?: { tags: string[] }
): Promise<SourceActionResult> => {
  const tags = context?.tags ?? [];
  const groups = groupByIndex(episodes);

  const allCurrentTags = new Set<string>();
  for (const ep of episodes) {
    for (const tag of getActionContext(ep).workflowTags) {
      allCurrentTags.add(tag);
    }
  }

  const add = tags;
  const remove = [...allCurrentTags].filter((t) => !tags.includes(t));

  const results = await Promise.allSettled(
    groups.map(({ index, ids }) => bulkUpdateAlertTags({ http, alertIds: ids, index, add, remove }))
  );

  let succeeded = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let idx = 0; idx < results.length; idx++) {
    const result = results[idx];
    if (result.status === 'fulfilled') {
      succeeded += groups[idx].ids.length;
    } else {
      failed += groups[idx].ids.length;
      errors.push(result.reason?.message ?? 'Unknown error');
    }
  }

  return { succeeded, failed, errors };
};

export const classicActionExtensions: Array<EpisodeActionExtension<any>> = [
  {
    actionId: 'ALERTING_V2_ACK_EPISODE',
    isCompatible: (ep) => getActionContext(ep).workflowStatus !== 'acknowledged',
    execute: (eps, http) => updateWorkflowStatus(eps, http, 'acknowledged'),
  },
  {
    actionId: 'ALERTING_V2_UNACK_EPISODE',
    isCompatible: (ep) => getActionContext(ep).workflowStatus === 'acknowledged',
    execute: (eps, http) => updateWorkflowStatus(eps, http, 'open'),
  },
  {
    actionId: 'ALERTING_V2_RESOLVE_EPISODE',
    isCompatible: (ep) => ep['episode.status'] !== ALERT_EPISODE_STATUS.INACTIVE,
    execute: async (eps, http) => {
      const groups = groupByIndex(eps);
      const indices = groups.map((g) => g.index);
      const alertUuids = groups.flatMap((g) => g.ids);
      try {
        await bulkUntrackAlerts({ http, indices, alertUuids });
        return { succeeded: alertUuids.length, failed: 0 };
      } catch (e) {
        return { succeeded: 0, failed: alertUuids.length, errors: [e?.message ?? 'Unknown error'] };
      }
    },
  },
  {
    actionId: 'ALERTING_V2_SNOOZE_EPISODE',
    isCompatible: (ep) => !isEpisodeSnoozed(ep.last_snooze_action, ep.snooze_expiry),
    execute: async (eps, http, context) => {
      const expiry: string | null = context?.expiry ?? null;
      let succeeded = 0;
      let failed = 0;
      const errors: string[] = [];

      if (expiry === null) {
        const rules = groupByRule(eps);
        try {
          await bulkMuteAlerts({ http, rules });
          succeeded = eps.length;
        } catch (e) {
          failed = eps.length;
          errors.push(e?.message ?? 'Unknown error');
        }
      } else {
        const results = await Promise.allSettled(
          eps.map((ep) => {
            const ctx = getActionContext(ep);
            return snoozeAlertInstance({
              http,
              id: ctx.ruleId,
              instanceId: ctx.instanceId ?? ctx.alertUuid,
              expiresAt: expiry,
            });
          })
        );
        for (const r of results) {
          if (r.status === 'fulfilled') succeeded++;
          else {
            failed++;
            errors.push(r.reason?.message ?? 'Unknown error');
          }
        }
      }

      return { succeeded, failed, errors };
    },
  },
  {
    actionId: 'ALERTING_V2_UNSNOOZE_EPISODE',
    isCompatible: (ep) => isEpisodeSnoozed(ep.last_snooze_action, ep.snooze_expiry),
    execute: async (eps, http) => {
      const mutedEps = eps.filter((ep) => ep.snooze_expiry == null);
      const snoozedEps = eps.filter((ep) => ep.snooze_expiry != null);

      let succeeded = 0;
      let failed = 0;
      const errors: string[] = [];

      if (mutedEps.length > 0) {
        const rules = groupByRule(mutedEps);
        try {
          await bulkUnmuteAlerts({ http, rules });
          succeeded += mutedEps.length;
        } catch (e) {
          failed += mutedEps.length;
          errors.push(e?.message ?? 'Unknown error');
        }
      }

      if (snoozedEps.length > 0) {
        const results = await Promise.allSettled(
          snoozedEps.map((ep) => {
            const ctx = getActionContext(ep);
            return unsnoozeAlertInstance({
              http,
              id: ctx.ruleId,
              instanceId: ctx.instanceId ?? ctx.alertUuid,
            });
          })
        );
        for (const r of results) {
          if (r.status === 'fulfilled') succeeded++;
          else {
            failed++;
            errors.push(r.reason?.message ?? 'Unknown error');
          }
        }
      }

      return { succeeded, failed, errors };
    },
  },
  {
    actionId: 'ALERTING_V2_EDIT_EPISODE_TAGS',
    isCompatible: () => true,
    execute: (eps, http, context) => updateWorkflowTags(eps, http, context),
  },
];
