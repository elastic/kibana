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
import { getAlertSnoozeStateByRule } from '@kbn/response-ops-alerts-apis/apis/get_muted_alerts_instances_by_rule';
import type { HttpStart } from '@kbn/core-http-browser';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import type { AlertEpisode } from '../queries/episodes_query';
import type {
  EpisodeActionExtension,
  EpisodeSnoozePayload,
  SourceActionResult,
} from '../types/episode_data_source';
import { isEpisodeSnoozed } from '../utils/is_episode_snoozed';
import type { ClassicAlertActionContext } from './utils/map_alert';
import { getErrorMessage } from '../actions/helpers';
import { INDEFINITE_SNOOZE_NOT_APPLIED } from '../actions/translations';

/** Reads a classic row's action context, which the source is not required to set. */
export const getActionContext = (episode: {
  source_action_context?: unknown;
}): Partial<ClassicAlertActionContext> =>
  (episode.source_action_context ?? {}) as Partial<ClassicAlertActionContext>;

const hasSnoozedInstance = (ep: AlertEpisode): boolean =>
  ep.snoozed_until != null || Boolean(ep.snooze_conditions?.length);

interface SnoozeTarget {
  episode: AlertEpisode;
  ruleId: string;
  instanceId: string;
}

const toSnoozeTargets = (episodes: AlertEpisode[]): SnoozeTarget[] =>
  episodes.flatMap((episode) => {
    const { ruleId, instanceId } = getActionContext(episode);
    return ruleId && instanceId ? [{ episode, ruleId, instanceId }] : [];
  });

const groupTargetsByRuleId = (targets: SnoozeTarget[]): SnoozeTarget[][] => {
  const byRuleId = new Map<string, SnoozeTarget[]>();
  for (const target of targets) {
    const ruleTargets = byRuleId.get(target.ruleId) ?? [];
    ruleTargets.push(target);
    byRuleId.set(target.ruleId, ruleTargets);
  }
  return [...byRuleId.values()];
};

const filterMutedTargets = async (
  targets: SnoozeTarget[],
  http: HttpStart
): Promise<SnoozeTarget[]> => {
  const { data } = await getAlertSnoozeStateByRule({
    http,
    ruleIds: [...new Set(targets.map(({ ruleId }) => ruleId))],
  });
  const mutedByRuleId = new Map(data.map(({ id, mutedAlertIds }) => [id, new Set(mutedAlertIds)]));
  return targets.filter(({ ruleId, instanceId }) => mutedByRuleId.get(ruleId)?.has(instanceId));
};

const groupByIndex = (episodes: AlertEpisode[]): Array<{ index: string; ids: string[] }> => {
  const groups = new Map<string, string[]>();
  for (const ep of episodes) {
    const { index, alertUuid } = getActionContext(ep);
    if (!index || !alertUuid) continue;
    const ids = groups.get(index) ?? [];
    ids.push(alertUuid);
    groups.set(index, ids);
  }
  return [...groups.entries()].map(([index, ids]) => ({ index, ids }));
};

const groupByRule = (
  episodes: AlertEpisode[]
): Array<{ rule_id: string; alert_instance_ids: string[] }> => {
  const groups = new Map<string, string[]>();
  for (const ep of episodes) {
    const { ruleId, instanceId } = getActionContext(ep);
    if (!ruleId || !instanceId) continue;
    const ids = groups.get(ruleId) ?? [];
    ids.push(instanceId);
    groups.set(ruleId, ids);
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
      errors.push(getErrorMessage(result.reason));
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
    for (const tag of getActionContext(ep).workflowTags ?? []) {
      allCurrentTags.add(tag);
    }
  }

  const add = tags;
  const remove = [...allCurrentTags].filter((t) => !tags.includes(t));

  if (add.length === 0 && remove.length === 0) {
    return { succeeded: 0, failed: 0, unchanged: episodes.length };
  }

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
      errors.push(getErrorMessage(result.reason));
    }
  }

  return { succeeded, failed, errors };
};

const snoozeExtension: EpisodeActionExtension<EpisodeSnoozePayload> = {
  actionId: 'ALERTING_V2_SNOOZE_EPISODE',
  isCompatible: (ep) => {
    const { ruleId, instanceId } = getActionContext(ep);
    return Boolean(ruleId) && Boolean(instanceId);
  },
  execute: async (eps, http, context) => {
    const snoozedUntil = context?.snoozedUntil ?? null;
    const conditions = context?.conditions;
    const conditionOperator = context?.conditionOperator;
    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];

    // Only an expiry-less snooze with nothing to lift it is a plain mute; a
    // conditions-only snooze still needs the snooze API to record them.
    if (snoozedUntil === null && !conditions?.length) {
      try {
        await bulkMuteAlerts({ http, rules: groupByRule(eps) });
      } catch (e) {
        return { succeeded: 0, failed: eps.length, errors: [getErrorMessage(e)] };
      }

      const replacedTargets = toSnoozeTargets(eps.filter(hasSnoozedInstance));
      succeeded = eps.length - replacedTargets.length;

      if (replacedTargets.length === 0) {
        return { succeeded, failed, errors };
      }

      let mutedTargets: SnoozeTarget[];
      try {
        mutedTargets = await filterMutedTargets(replacedTargets, http);
      } catch {
        // Rows with no snooze to clear are already counted on the mute response alone, so a
        // failed lookup counts the same way and the existing snoozes stay in place.
        return { succeeded: eps.length, failed: 0, errors: [] };
      }

      const unmutedCount = replacedTargets.length - mutedTargets.length;
      if (unmutedCount > 0) {
        failed += unmutedCount;
        errors.push(INDEFINITE_SNOOZE_NOT_APPLIED);
      }

      succeeded += mutedTargets.length;

      await Promise.allSettled(
        groupTargetsByRuleId(mutedTargets).map(async (sameRuleTargets) => {
          for (const { ruleId, instanceId } of sameRuleTargets) {
            try {
              await unsnoozeAlertInstance({ http, id: ruleId, instanceId });
            } catch (e) {
              failed++;
              errors.push(getErrorMessage(e));
            }
          }
        })
      );

      return { succeeded, failed, errors };
    }

    // The snooze runs first so that a failure leaves the alert as it was. Clearing
    // the mute afterwards keeps a muted alert quiet until its new snooze is in place.
    const snoozedMuted: AlertEpisode[] = [];

    await Promise.allSettled(
      groupTargetsByRuleId(toSnoozeTargets(eps)).map(async (sameRuleTargets) => {
        for (const { episode, ruleId, instanceId } of sameRuleTargets) {
          try {
            await snoozeAlertInstance({
              http,
              id: ruleId,
              instanceId,
              ...(snoozedUntil === null ? {} : { expiresAt: snoozedUntil }),
              ...(conditions?.length ? { conditions, conditionOperator } : {}),
            });
            if (episode.is_muted === true) {
              snoozedMuted.push(episode);
            } else {
              succeeded++;
            }
          } catch (e) {
            failed++;
            errors.push(getErrorMessage(e));
          }
        }
      })
    );

    if (snoozedMuted.length > 0) {
      try {
        await bulkUnmuteAlerts({ http, rules: groupByRule(snoozedMuted) });
        succeeded += snoozedMuted.length;
      } catch (e) {
        failed += snoozedMuted.length;
        errors.push(getErrorMessage(e));
      }
    }

    return { succeeded, failed, errors };
  },
};

export const classicActionExtensions: Array<EpisodeActionExtension<any>> = [
  {
    actionId: 'ALERTING_V2_ACK_EPISODE',
    isCompatible: (ep) => {
      const { workflowStatus } = getActionContext(ep);
      return workflowStatus === 'open' || workflowStatus == null;
    },
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
        return { succeeded: 0, failed: alertUuids.length, errors: [getErrorMessage(e)] };
      }
    },
  },
  snoozeExtension,
  {
    actionId: 'ALERTING_V2_UNSNOOZE_EPISODE',
    isCompatible: (ep) => {
      const { ruleId, instanceId } = getActionContext(ep);
      return (
        Boolean(ruleId) &&
        Boolean(instanceId) &&
        isEpisodeSnoozed(ep.last_snooze_action, ep.snoozed_until)
      );
    },
    execute: async (eps, http) => {
      let succeeded = 0;
      let failed = 0;
      const errors: string[] = [];

      const epsToUnmute = eps.filter((ep) => ep.is_muted === true);
      const epsToUnsnooze = eps.filter(hasSnoozedInstance);

      let unmuteFailed = false;

      if (epsToUnmute.length > 0) {
        const rules = groupByRule(epsToUnmute);
        const mutedOnlyCount = epsToUnmute.filter((ep) => !hasSnoozedInstance(ep)).length;
        try {
          await bulkUnmuteAlerts({ http, rules });
          succeeded += mutedOnlyCount;
        } catch (e) {
          unmuteFailed = true;
          failed += epsToUnmute.length;
          errors.push(getErrorMessage(e));
        }
      }

      const targetsToUnsnooze = toSnoozeTargets(epsToUnsnooze);

      if (targetsToUnsnooze.length > 0) {
        const results = await Promise.allSettled(
          targetsToUnsnooze.map(({ ruleId, instanceId }) =>
            unsnoozeAlertInstance({ http, id: ruleId, instanceId })
          )
        );
        for (let i = 0; i < results.length; i++) {
          const r = results[i];
          // Already counted as failed in the unmute path above
          const skipCount = unmuteFailed && targetsToUnsnooze[i].episode.is_muted === true;
          if (r.status === 'fulfilled') {
            if (!skipCount) succeeded++;
          } else {
            if (!skipCount) failed++;
            errors.push(getErrorMessage(r.reason));
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
