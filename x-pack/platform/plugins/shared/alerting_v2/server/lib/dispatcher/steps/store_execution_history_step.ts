/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { IEvent } from '@kbn/event-log-plugin/server';
import { SAVED_OBJECT_REL_PRIMARY } from '@kbn/event-log-plugin/server';
import { ACTION_POLICY_SAVED_OBJECT_TYPE, RULE_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import type { EventLogServiceContract } from '../../services/event_log_service/event_log_service';
import { EventLogServiceToken } from '../../services/event_log_service/tokens';
import type {
  ActionGroup,
  ActionGroupId,
  ActionPolicyId,
  DispatchFailure,
  DispatcherPipelineState,
  DispatcherStep,
  DispatcherStepOutput,
  Rule,
  RuleId,
} from '../types';
import {
  ACTION_POLICY_EVENT_ACTIONS,
  type ActionPolicyEventAction,
  type DispatchFailureReason,
} from './constants';
import { getUnmatchedEpisodes } from './unmatched_episodes';
import { episodeSubject } from './utils/subject';

/** Index of workflow ids that recorded a dispatch failure, keyed by action group id. */
type FailedDestinations = ReadonlyMap<ActionGroupId, ReadonlySet<string>>;

const RULE_REF_CAP = 50;

interface SavedObjectRef {
  type: string;
  type_id?: string;
  id: string;
  rel: typeof SAVED_OBJECT_REL_PRIMARY;
  namespace?: string;
}

interface PolicySummary {
  policyId: ActionPolicyId;
  spaceId: string;
  episodeIds: Set<string>;
  ruleIds: Set<RuleId>;
  actionGroupIds: Set<string>;
  workflowIds: Set<string>;
  workflowExecutionIds: Set<string>;
}

interface PolicySummaryDispatcherFields {
  episode_count: number;
  episode_ids: string[];
  rule_count: number;
  rule_ids?: string[];
  action_group_count: number;
  action_group_ids: string[];
  workflow_ids: string[];
  workflow_execution_ids: string[];
}

interface UnmatchedDispatcherFields {
  episode_count: number;
  episode_ids: string[];
}

interface DispatchFailureDispatcherFields {
  failure_reason: DispatchFailureReason;
  action_group_count: number;
  action_group_ids: ActionGroupId[];
  workflow_ids: string[];
  episode_count: number;
  episode_ids: string[];
  rule_count: number;
  rule_ids?: string[];
}

type DispatcherFields =
  | PolicySummaryDispatcherFields
  | UnmatchedDispatcherFields
  | DispatchFailureDispatcherFields;

interface UnmatchedGroup {
  episodeIds: Set<string>;
  space_id: string;
  ruleId: RuleId | null;
}

@injectable()
export class StoreExecutionHistoryStep implements DispatcherStep {
  public readonly name = 'store_execution_history';

  constructor(
    @inject(EventLogServiceToken)
    private readonly eventLogService: EventLogServiceContract
  ) {}

  public async execute(state: Readonly<DispatcherPipelineState>): Promise<DispatcherStepOutput> {
    const {
      dispatch = [],
      throttled = [],
      dispatchable = [],
      dispatchedExecutions,
      dispatchFailures = [],
      rules,
      input,
    } = state;

    if (
      dispatch.length === 0 &&
      throttled.length === 0 &&
      dispatchable.length === 0 &&
      dispatchFailures.length === 0
    ) {
      return { type: 'continue' };
    }

    const timestamp = input.startedAt.toISOString();
    const { executionUuid } = input;

    const failedDestinations = indexFailedDestinations(dispatchFailures);

    for (const summary of aggregateByPolicy(
      dispatch,
      dispatchedExecutions,
      failedDestinations
    ).values()) {
      this.emitPolicySummary({
        timestamp,
        executionUuid,
        summary,
        action: ACTION_POLICY_EVENT_ACTIONS.DISPATCHED,
        rules,
      });
    }

    for (const summary of aggregateByPolicy(throttled).values()) {
      this.emitPolicySummary({
        timestamp,
        executionUuid,
        summary,
        action: ACTION_POLICY_EVENT_ACTIONS.THROTTLED,
        rules,
      });
    }

    // Pass the full `dispatch` list — including fully-failed groups — so that
    // their episodes are not double-reported as `unmatched`. Those episodes did
    // match a policy; `dispatch_failed` already carries their episode_ids.
    const unmatched = aggregateUnmatchedBySubject(
      getUnmatchedEpisodes(dispatchable, dispatch, throttled)
    );
    for (const group of unmatched) {
      this.emitUnmatchedSummary({ timestamp, executionUuid, group });
    }

    for (const failure of dispatchFailures) {
      this.emitDispatchFailure({ timestamp, executionUuid, failure, rules });
    }

    return { type: 'continue' };
  }

  private emitPolicySummary({
    timestamp,
    executionUuid,
    summary,
    action,
    rules,
  }: {
    timestamp: string;
    executionUuid: string;
    summary: PolicySummary;
    action: ActionPolicyEventAction;
    rules: Map<RuleId, Rule> | undefined;
  }): void {
    const ruleIds = Array.from(summary.ruleIds);
    const { refs, spillOver } = buildPolicyAndRuleRefs(
      summary.policyId,
      summary.spaceId,
      ruleIds,
      rules
    );

    this.eventLogService.logEvent(
      buildEvent({
        timestamp,
        executionUuid,
        action,
        spaceId: summary.spaceId,
        savedObjects: refs,
        dispatcherFields: {
          episode_count: summary.episodeIds.size,
          episode_ids: Array.from(summary.episodeIds),
          rule_count: summary.ruleIds.size,
          rule_ids: spillOver.length > 0 ? spillOver : undefined,
          action_group_count: summary.actionGroupIds.size,
          action_group_ids: Array.from(summary.actionGroupIds),
          workflow_ids: Array.from(summary.workflowIds),
          workflow_execution_ids: Array.from(summary.workflowExecutionIds),
        },
      })
    );
  }

  private emitUnmatchedSummary({
    timestamp,
    executionUuid,
    group,
  }: {
    timestamp: string;
    executionUuid: string;
    group: UnmatchedGroup;
  }): void {
    const savedObjects: SavedObjectRef[] =
      group.ruleId != null ? [ruleRef({ id: group.ruleId, spaceId: group.space_id })] : [];
    this.eventLogService.logEvent(
      buildEvent({
        timestamp,
        executionUuid,
        action: ACTION_POLICY_EVENT_ACTIONS.UNMATCHED,
        spaceId: group.space_id,
        savedObjects,
        dispatcherFields: {
          episode_count: group.episodeIds.size,
          episode_ids: Array.from(group.episodeIds),
        },
      })
    );
  }

  private emitDispatchFailure({
    timestamp,
    executionUuid,
    failure,
    rules,
  }: {
    timestamp: string;
    executionUuid: string;
    failure: DispatchFailure;
    rules: Map<RuleId, Rule> | undefined;
  }): void {
    const ruleIdSet = new Set<string>();
    const episodeIdSet = new Set<string>();
    for (const { rule_id, episode_id } of failure.episodes) {
      if (rule_id != null) ruleIdSet.add(rule_id);
      episodeIdSet.add(episode_id);
    }
    const ruleIds = Array.from(ruleIdSet);
    const episodeIds = Array.from(episodeIdSet);
    const { refs, spillOver } = buildPolicyAndRuleRefs(
      failure.policyId,
      failure.spaceId,
      ruleIds,
      rules
    );

    this.eventLogService.logEvent(
      buildEvent({
        timestamp,
        executionUuid,
        action: ACTION_POLICY_EVENT_ACTIONS.DISPATCH_FAILED,
        outcome: 'failure',
        error: failure.message,
        spaceId: failure.spaceId,
        savedObjects: refs,
        dispatcherFields: {
          failure_reason: failure.reason,
          action_group_count: 1,
          action_group_ids: [failure.actionGroupId],
          workflow_ids: [failure.workflowId],
          episode_count: episodeIds.length,
          episode_ids: episodeIds,
          rule_count: ruleIds.length,
          rule_ids: spillOver.length > 0 ? spillOver : undefined,
        },
      })
    );
  }
}

function aggregateByPolicy(
  groups: readonly ActionGroup[],
  dispatchedExecutions?: Map<ActionGroupId, string[]>,
  failedDestinations?: FailedDestinations
): Map<ActionPolicyId, PolicySummary> {
  const summaries = new Map<ActionPolicyId, PolicySummary>();
  for (const group of groups) {
    // Compute the subset of destinations that were successfully dispatched.
    // When failedDestinations is provided (dispatched path), destinations that
    // recorded a DispatchFailure are excluded. Groups with at least one
    // destination but no delivered destinations (total failure) are skipped
    // entirely — their episodes and rules are already captured in
    // `dispatch_failed` events and must not appear in the `dispatched` summary.
    const failed = failedDestinations?.get(group.id);
    const delivered =
      failed != null
        ? group.destinations.filter((destination) => !failed.has(destination.id))
        : group.destinations;

    if (group.destinations.length > 0 && delivered.length === 0) {
      // All destinations failed — skip this group entirely for this summary.
      continue;
    }

    let summary = summaries.get(group.policyId);
    if (!summary) {
      summary = {
        policyId: group.policyId,
        spaceId: group.spaceId,
        episodeIds: new Set(),
        ruleIds: new Set(),
        actionGroupIds: new Set(),
        workflowIds: new Set(),
        workflowExecutionIds: new Set(),
      };
      summaries.set(group.policyId, summary);
    }
    summary.actionGroupIds.add(group.id);
    for (const destination of delivered) {
      summary.workflowIds.add(destination.id);
    }
    for (const executionId of dispatchedExecutions?.get(group.id) ?? []) {
      summary.workflowExecutionIds.add(executionId);
    }
    for (const episode of group.episodes) {
      summary.episodeIds.add(episode.episode_id);
      if (episode.rule_id != null) {
        summary.ruleIds.add(episode.rule_id);
      }
    }
  }
  return summaries;
}

function buildPolicyAndRuleRefs(
  policyId: ActionPolicyId,
  spaceId: string,
  ruleIds: string[],
  rules: Map<RuleId, Rule> | undefined
): { refs: SavedObjectRef[]; spillOver: string[] } {
  const capped = ruleIds.slice(0, RULE_REF_CAP);
  const spillOver = ruleIds.slice(RULE_REF_CAP);
  const refs: SavedObjectRef[] = [
    policyRef({ id: policyId, spaceId }),
    ...capped.map((id) => ruleRef({ id, spaceId: rules?.get(id)?.spaceId ?? spaceId })),
  ];
  return { refs, spillOver };
}

function indexFailedDestinations(failures: readonly DispatchFailure[]): FailedDestinations {
  const index = new Map<ActionGroupId, Set<string>>();
  for (const { actionGroupId, workflowId } of failures) {
    let ids = index.get(actionGroupId);
    if (!ids) index.set(actionGroupId, (ids = new Set()));
    ids.add(workflowId);
  }
  return index;
}

function aggregateUnmatchedBySubject(
  unmatched: ReturnType<typeof getUnmatchedEpisodes>
): UnmatchedGroup[] {
  const bySubject = new Map<string, UnmatchedGroup>();
  for (const episode of unmatched) {
    const subject = episodeSubject(episode);
    let group = bySubject.get(subject);
    if (!group) {
      group = {
        episodeIds: new Set(),
        space_id: episode.space_id,
        ruleId: episode.rule_id,
      };
      bySubject.set(subject, group);
    }
    group.episodeIds.add(episode.episode_id);
  }
  return [...bySubject.values()];
}

function ruleRef({ id, spaceId }: { id: string; spaceId: string | undefined }): SavedObjectRef {
  return {
    type: RULE_SAVED_OBJECT_TYPE,
    type_id: 'alert',
    id,
    rel: SAVED_OBJECT_REL_PRIMARY,
    namespace: spaceId === 'default' ? undefined : spaceId,
  };
}

function policyRef({ id, spaceId }: { id: string; spaceId: string }): SavedObjectRef {
  return {
    type: ACTION_POLICY_SAVED_OBJECT_TYPE,
    id,
    rel: SAVED_OBJECT_REL_PRIMARY,
    namespace: spaceId === 'default' ? undefined : spaceId,
  };
}

function buildEvent({
  timestamp,
  executionUuid,
  action,
  outcome = 'success',
  error,
  spaceId,
  savedObjects,
  dispatcherFields,
}: {
  timestamp: string;
  executionUuid: string;
  action: ActionPolicyEventAction;
  outcome?: 'success' | 'failure';
  error?: string;
  spaceId: string;
  savedObjects: SavedObjectRef[];
  dispatcherFields: DispatcherFields;
}): IEvent {
  return {
    '@timestamp': timestamp,
    event: { action, outcome },
    ...(error ? { error: { message: error } } : {}),
    kibana: {
      saved_objects: savedObjects,
      space_ids: [spaceId],
      alerting_v2: {
        dispatcher: {
          ...dispatcherFields,
          execution: { uuid: executionUuid },
        },
      },
    },
  };
}
