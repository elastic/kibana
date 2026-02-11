/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import moment from 'moment';
import objectHash from 'object-hash';
import { ALERT_ACTIONS_DATA_STREAM, type AlertAction } from '../../resources/alert_actions';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../services/logger_service/logger_service';
import { queryResponseToRecords } from '../services/query_service/query_response_to_records';
import type { QueryServiceContract } from '../services/query_service/query_service';
import { QueryServiceInternalToken } from '../services/query_service/tokens';
import type { StorageServiceContract } from '../services/storage_service/storage_service';
import { StorageServiceInternalToken } from '../services/storage_service/tokens';
import { LOOKBACK_WINDOW_MINUTES } from './constants';
import {
  executeFakeWorkflow,
  getFakeNotificationPoliciesByIds,
  getFakeRulesByIds,
} from './faker_service';
import {
  getAlertEpisodeSuppressionsQuery,
  getDispatchableAlertEventsQuery,
  getLastNotifiedTimestampsQuery,
} from './queries';
import type {
  AlertEpisode,
  AlertEpisodeSuppression,
  DispatcherExecutionParams,
  DispatcherExecutionResult,
  LastNotifiedRecord,
  MatchedPair,
  NotificationGroup,
  NotificationGroupId,
  NotificationPolicy,
  NotificationPolicyId,
  Rule,
  RuleId,
} from './types';

export interface DispatcherServiceContract {
  run(params: DispatcherExecutionParams): Promise<DispatcherExecutionResult>;
}

@injectable()
export class DispatcherService implements DispatcherServiceContract {
  constructor(
    @inject(QueryServiceInternalToken) private readonly queryService: QueryServiceContract,
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(StorageServiceInternalToken) private readonly storageService: StorageServiceContract
  ) {}

  public async run({
    previousStartedAt = new Date(),
  }: DispatcherExecutionParams): Promise<DispatcherExecutionResult> {
    const startedAt = new Date();

    const alertEpisodes = await this.fetchAlertEpisodes(previousStartedAt);
    const suppressions = await this.fetchAlertEpisodeSuppressions(alertEpisodes);

    const { suppressed, active } = this.applySuppression(alertEpisodes, suppressions);

    const uniqueRuleIds = [...new Set(active.map((ep) => ep.rule_id))];
    const rules = await getFakeRulesByIds(uniqueRuleIds);

    const uniquePolicyIds = [...new Set(rules.values().flatMap((r) => r.notificationPolicyIds))];
    const policies = await getFakeNotificationPoliciesByIds(uniquePolicyIds);

    const matched = this.evaluateMatchers(active, rules, policies);
    const notificationGroups = this.buildNotificationGroups(matched);

    const { dispatch, throttled } = await this.applyThrottling(
      notificationGroups,
      policies,
      startedAt
    );

    for (const group of dispatch) {
      await executeFakeWorkflow(group);
    }

    this.logger.debug({
      message: `Dispatcher processed ${alertEpisodes.length} alert episodes: ${suppressed.length} suppressed, ${active.length} not suppressed`,
    });

    const now = new Date();
    await this.storageService.bulkIndexDocs<AlertAction>({
      index: ALERT_ACTIONS_DATA_STREAM,
      docs: [
        ...suppressed.map((episode) => this.toAction({ episode, actionType: 'suppress', now })),
        ...throttled.flatMap((group) =>
          group.episodes.map((episode) => this.toAction({ episode, actionType: 'suppress', now }))
        ),
        ...dispatch.flatMap((group) =>
          group.episodes.map((episode) => this.toAction({ episode, actionType: 'fire', now }))
        ),
        // This is used to determine if the group should be throttled in a following run
        ...dispatch.map((group) => ({
          '@timestamp': now.toISOString(),
          actor: 'system',
          action_type: 'notified',
          rule_id: group.ruleId,
          group_hash: 'irrelevant', // irrelevant
          last_series_event_timestamp: now.toISOString(), // irrelevant
          notification_group_id: group.id,
          source: 'internal',
        })),
      ],
    });

    return { startedAt };
  }

  private async applyThrottling(
    groups: NotificationGroup[],
    policies: Map<string, NotificationPolicy>,
    now: Date
  ): Promise<{ dispatch: NotificationGroup[]; throttled: NotificationGroup[] }> {
    const dispatch: NotificationGroup[] = [];
    const throttled: NotificationGroup[] = [];

    const lastNotifiedMap = await this.fetchLastNotifiedTimestamps(groups.map((group) => group.id));

    for (const group of groups) {
      const policy = policies.get(group.policyId)!;
      const lastNotified = lastNotifiedMap.get(group.id);

      if (
        lastNotified &&
        policy.throttle &&
        policy.throttle.interval &&
        isWithinInterval(lastNotified, policy.throttle.interval, now)
      ) {
        throttled.push(group);
      } else {
        dispatch.push(group);
      }
    }

    return { dispatch, throttled };
  }

  private buildNotificationGroups(matched: MatchedPair[]): NotificationGroup[] {
    const groupMap = new Map<string, NotificationGroup>();

    for (const { episode, policy } of matched) {
      let groupKey: Record<string, unknown> = {};
      if (policy.groupBy.length === 0) {
        // No grouping: each episode dispatches individually.
        // Use the episode's identity as the group key for throttle tracking.
        groupKey = {
          groupHash: episode.group_hash,
          episodeId: episode.episode_id,
        };
      } else {
        // for (const field of policy.groupBy) {
        //   // TODO: replace {} with episode.data when ESQL flattened support is added
        //   groupKey[field] = get({}, field);
        // }
        throw new Error('Grouping by fields is not supported yet');
      }

      // This is used to identify the notification group in the alert-actions
      const notificationGroupId = objectHash({
        ruleId: episode.rule_id,
        policyId: policy.id,
        groupKey,
      });

      if (!groupMap.has(notificationGroupId)) {
        groupMap.set(notificationGroupId, {
          id: notificationGroupId,
          ruleId: episode.rule_id,
          policyId: policy.id,
          workflowId: policy.workflowId,
          groupKey,
          episodes: [],
        });
      }

      groupMap.get(notificationGroupId)!.episodes.push(episode);
    }

    return [...groupMap.values()];
  }

  private evaluateMatchers(
    activeEpisodes: AlertEpisode[],
    rules: Map<RuleId, Rule>,
    policies: Map<NotificationPolicyId, NotificationPolicy>
  ): MatchedPair[] {
    const matched: MatchedPair[] = [];

    for (const episode of activeEpisodes) {
      const rule = rules.get(episode.rule_id);
      if (!rule) continue;

      for (const policyId of rule.notificationPolicyIds) {
        const policy = policies.get(policyId);
        if (!policy) continue;

        // Empty matcher = catch-all, always matches
        if (!policy.matcher) {
          this.logger.debug({
            message: `Episode ${episode.episode_id} matches policy ${policyId} (catch-all)`,
          });
          matched.push({ episode, policy });
          continue;
        }

        // TODO: Handle matcher evaluation here
        // matched.push({ episode, policy });
      }
    }

    return matched;
  }

  private applySuppression(
    episodes: AlertEpisode[],
    suppressions: AlertEpisodeSuppression[]
  ): { suppressed: AlertEpisode[]; active: AlertEpisode[] } {
    const suppressionMap = new Map<string, AlertEpisodeSuppression>();

    for (const s of suppressions) {
      if (s.episode_id) {
        suppressionMap.set(`${s.rule_id}:${s.group_hash}:${s.episode_id}`, s);
      } else {
        suppressionMap.set(`${s.rule_id}:${s.group_hash}:*`, s);
      }
    }

    const suppressed: AlertEpisode[] = [];
    const active: AlertEpisode[] = [];

    for (const ep of episodes) {
      const episodeKey = `${ep.rule_id}:${ep.group_hash}:${ep.episode_id}`;
      const seriesKey = `${ep.rule_id}:${ep.group_hash}:*`;

      const episodeSuppression = suppressionMap.get(episodeKey);
      const seriesSuppression = suppressionMap.get(seriesKey);

      if (episodeSuppression?.should_suppress || seriesSuppression?.should_suppress) {
        suppressed.push(ep);
      } else {
        active.push(ep);
      }
    }

    return { suppressed, active };
  }

  private toAction({
    episode,
    actionType,
    now,
    reason,
  }: {
    episode: AlertEpisode;
    actionType: 'suppress' | 'fire' | 'notified';
    now: Date;
    reason?: string;
  }): AlertAction {
    return {
      '@timestamp': now.toISOString(),
      group_hash: episode.group_hash,
      last_series_event_timestamp: episode.last_event_timestamp,
      actor: 'system',
      action_type: actionType,
      rule_id: episode.rule_id,
      source: 'internal',
      reason,
    };
  }

  private async fetchAlertEpisodeSuppressions(
    alertEpisodes: AlertEpisode[]
  ): Promise<AlertEpisodeSuppression[]> {
    if (alertEpisodes.length === 0) {
      return [];
    }

    const result = await this.queryService.executeQuery({
      query: getAlertEpisodeSuppressionsQuery(alertEpisodes).query,
    });

    return queryResponseToRecords<AlertEpisodeSuppression>(result);
  }

  private async fetchAlertEpisodes(previousStartedAt: Date): Promise<AlertEpisode[]> {
    const lookback = moment(previousStartedAt)
      .subtract(LOOKBACK_WINDOW_MINUTES, 'minutes')
      .toISOString();

    const result = await this.queryService.executeQuery({
      query: getDispatchableAlertEventsQuery().query,
      filter: {
        range: {
          '@timestamp': {
            gte: lookback,
          },
        },
      },
    });

    return queryResponseToRecords<AlertEpisode>(result);
  }

  private async fetchLastNotifiedTimestamps(
    notificationGroupIds: NotificationGroupId[]
  ): Promise<Map<NotificationGroupId, Date>> {
    const result = await this.queryService.executeQuery({
      query: getLastNotifiedTimestampsQuery(notificationGroupIds).query,
    });

    const records = queryResponseToRecords<LastNotifiedRecord>(result);
    const lastNotifiedMap = new Map<NotificationGroupId, Date>(
      records.map((record) => [record.notification_group_id, new Date(record.last_notified)])
    );
    return lastNotifiedMap;
  }
}

function isWithinInterval(lastNotifiedAt: Date, interval: string, now: Date): boolean {
  const intervalMillis = moment.duration(interval).asMilliseconds();
  return lastNotifiedAt.getTime() + intervalMillis > now.getTime();
}
