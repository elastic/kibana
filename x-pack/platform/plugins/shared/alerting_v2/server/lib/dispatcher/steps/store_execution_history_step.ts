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
  DispatcherPipelineState,
  DispatcherStep,
  DispatcherStepOutput,
  Rule,
  RuleId,
} from '../types';
import { ACTION_POLICY_EVENT_ACTIONS, type ActionPolicyEventAction } from './constants';
import { getUnmatchedEpisodes } from './unmatched_episodes';

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

type DispatcherFields = PolicySummaryDispatcherFields | UnmatchedDispatcherFields;

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
      rules,
      input,
    } = state;

    if (dispatch.length === 0 && throttled.length === 0 && dispatchable.length === 0) {
      return { type: 'continue' };
    }

    const timestamp = input.startedAt.toISOString();
    const { executionUuid } = input;

    for (const summary of aggregateByPolicy(dispatch, dispatchedExecutions).values()) {
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

    const unmatched = aggregateUnmatchedByRule(
      getUnmatchedEpisodes(dispatchable, dispatch, throttled)
    );
    for (const [ruleId, episodeIds] of unmatched) {
      this.emitUnmatchedSummary({ timestamp, executionUuid, ruleId, episodeIds, rules });
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
    const capped = ruleIds.slice(0, RULE_REF_CAP);
    const spillOver = ruleIds.slice(RULE_REF_CAP);

    const refs: SavedObjectRef[] = [
      policyRef({ id: summary.policyId, spaceId: summary.spaceId }),
      ...capped.map((id) => {
        const rule = rules?.get(id);
        return ruleRef({
          id,
          spaceId: rule?.spaceId ?? summary.spaceId,
          kind: rule?.kind,
        });
      }),
    ];

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
    ruleId,
    episodeIds,
    rules,
  }: {
    timestamp: string;
    executionUuid: string;
    ruleId: RuleId;
    episodeIds: Set<string>;
    rules: Map<RuleId, Rule> | undefined;
  }): void {
    const rule = rules?.get(ruleId);
    this.eventLogService.logEvent(
      buildEvent({
        timestamp,
        executionUuid,
        action: ACTION_POLICY_EVENT_ACTIONS.UNMATCHED,
        spaceId: rule?.spaceId ?? 'default',
        savedObjects: [ruleRef({ id: ruleId, spaceId: rule?.spaceId, kind: rule?.kind })],
        dispatcherFields: {
          episode_count: episodeIds.size,
          episode_ids: Array.from(episodeIds),
        },
      })
    );
  }
}

function aggregateByPolicy(
  groups: readonly ActionGroup[],
  dispatchedExecutions?: Map<ActionGroupId, string[]>
): Map<ActionPolicyId, PolicySummary> {
  const summaries = new Map<ActionPolicyId, PolicySummary>();
  for (const group of groups) {
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
    for (const destination of group.destinations) {
      summary.workflowIds.add(destination.id);
    }
    for (const executionId of dispatchedExecutions?.get(group.id) ?? []) {
      summary.workflowExecutionIds.add(executionId);
    }
    for (const episode of group.episodes) {
      summary.episodeIds.add(episode.episode_id);
      summary.ruleIds.add(episode.rule_id);
    }
  }
  return summaries;
}

function aggregateUnmatchedByRule(
  unmatched: ReturnType<typeof getUnmatchedEpisodes>
): Map<RuleId, Set<string>> {
  const byRule = new Map<RuleId, Set<string>>();
  for (const episode of unmatched) {
    let ids = byRule.get(episode.rule_id);
    if (!ids) {
      ids = new Set();
      byRule.set(episode.rule_id, ids);
    }
    ids.add(episode.episode_id);
  }
  return byRule;
}

function ruleRef({
  id,
  spaceId,
  kind,
}: {
  id: string;
  spaceId: string | undefined;
  kind: Rule['kind'] | undefined;
}): SavedObjectRef {
  return {
    type: RULE_SAVED_OBJECT_TYPE,
    type_id: kind,
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
  spaceId,
  savedObjects,
  dispatcherFields,
}: {
  timestamp: string;
  executionUuid: string;
  action: ActionPolicyEventAction;
  spaceId: string;
  savedObjects: SavedObjectRef[];
  dispatcherFields: DispatcherFields;
}): IEvent {
  return {
    '@timestamp': timestamp,
    event: { action, outcome: 'success' },
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
