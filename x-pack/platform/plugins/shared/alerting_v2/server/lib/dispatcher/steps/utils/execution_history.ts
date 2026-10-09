/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEvent } from '@kbn/event-log-plugin/server';
import { SAVED_OBJECT_REL_PRIMARY } from '@kbn/event-log-plugin/server';
import { ACTION_POLICY_SAVED_OBJECT_TYPE, RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import type { EventLogServiceContract } from '../../../services/event_log_service/event_log_service';
import { DispatchOutcome, type RuleCatalog } from '../../state';
import type {
  ActionGroup,
  ActionGroupId,
  ActionPolicyId,
  Alert,
  DispatchFailure,
  RuleId,
} from '../../types';
import {
  ACTION_POLICY_EVENT_ACTIONS,
  type ActionPolicyEventAction,
  type DispatchFailureReason,
} from '../constants';
import { alertSubject } from './subject';

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
  alertIds: Set<string>;
  ruleIds: Set<RuleId>;
  actionGroupIds: Set<string>;
  workflowIds: Set<string>;
  workflowExecutionIds: Set<string>;
}

interface PolicySummaryDispatcherFields {
  alert_count: number;
  alert_ids: string[];
  rule_count: number;
  rule_ids?: string[];
  action_group_count: number;
  action_group_ids: string[];
  workflow_ids: string[];
  workflow_execution_ids: string[];
}

interface UnmatchedDispatcherFields {
  alert_count: number;
  alert_ids: string[];
}

interface DispatchFailureDispatcherFields {
  failure_reason: DispatchFailureReason;
  action_group_count: number;
  action_group_ids: ActionGroupId[];
  workflow_ids: string[];
  alert_count: number;
  alert_ids: string[];
  rule_count: number;
  rule_ids?: string[];
}

type DispatcherFields =
  | PolicySummaryDispatcherFields
  | UnmatchedDispatcherFields
  | DispatchFailureDispatcherFields;

interface UnmatchedGroup {
  alertIds: Set<string>;
  space_id: string;
  ruleId: RuleId | null;
}

/**
 * Emits the tick's per-policy `dispatched` / `throttled`, per-subject `unmatched` and per-failure
 * `dispatch_failed` event-log entries.
 */
export function emitExecutionHistory({
  eventLogService,
  dispatched,
  throttled,
  unmatched,
  outcome,
  rules,
  timestamp,
  executionUuid,
}: {
  eventLogService: EventLogServiceContract;
  dispatched: readonly ActionGroup[];
  throttled: readonly ActionGroup[];
  unmatched: readonly Alert[];
  outcome: DispatchOutcome;
  rules: RuleCatalog;
  timestamp: string;
  executionUuid: string;
}): void {
  for (const summary of aggregateByPolicy(dispatched, outcome).values()) {
    emitPolicySummary({
      eventLogService,
      timestamp,
      executionUuid,
      summary,
      action: ACTION_POLICY_EVENT_ACTIONS.DISPATCHED,
      rules,
    });
  }

  for (const summary of aggregateByPolicy(throttled, DispatchOutcome.empty()).values()) {
    emitPolicySummary({
      eventLogService,
      timestamp,
      executionUuid,
      summary,
      action: ACTION_POLICY_EVENT_ACTIONS.THROTTLED,
      rules,
    });
  }

  // `plan.unmatched` excludes every planned group — including fully-failed
  // ones — so their alerts are not double-reported as `unmatched`. Those
  // alerts did match a policy; `dispatch_failed` already carries their ids.
  for (const group of aggregateUnmatchedBySubject(unmatched)) {
    emitUnmatchedSummary({ eventLogService, timestamp, executionUuid, group });
  }

  for (const failure of outcome.failures) {
    emitDispatchFailure({ eventLogService, timestamp, executionUuid, failure, rules });
  }
}

function emitPolicySummary({
  eventLogService,
  timestamp,
  executionUuid,
  summary,
  action,
  rules,
}: {
  eventLogService: EventLogServiceContract;
  timestamp: string;
  executionUuid: string;
  summary: PolicySummary;
  action: ActionPolicyEventAction;
  rules: RuleCatalog;
}): void {
  const ruleIds = Array.from(summary.ruleIds);
  const { refs, spillOver } = buildPolicyAndRuleRefs(
    summary.policyId,
    summary.spaceId,
    ruleIds,
    rules
  );

  eventLogService.logEvent(
    buildEvent({
      timestamp,
      executionUuid,
      action,
      spaceId: summary.spaceId,
      savedObjects: refs,
      dispatcherFields: {
        alert_count: summary.alertIds.size,
        alert_ids: Array.from(summary.alertIds),
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

function emitUnmatchedSummary({
  eventLogService,
  timestamp,
  executionUuid,
  group,
}: {
  eventLogService: EventLogServiceContract;
  timestamp: string;
  executionUuid: string;
  group: UnmatchedGroup;
}): void {
  const savedObjects: SavedObjectRef[] =
    group.ruleId != null ? [ruleRef({ id: group.ruleId, spaceId: group.space_id })] : [];
  eventLogService.logEvent(
    buildEvent({
      timestamp,
      executionUuid,
      action: ACTION_POLICY_EVENT_ACTIONS.UNMATCHED,
      spaceId: group.space_id,
      savedObjects,
      dispatcherFields: {
        alert_count: group.alertIds.size,
        alert_ids: Array.from(group.alertIds),
      },
    })
  );
}

function emitDispatchFailure({
  eventLogService,
  timestamp,
  executionUuid,
  failure,
  rules,
}: {
  eventLogService: EventLogServiceContract;
  timestamp: string;
  executionUuid: string;
  failure: DispatchFailure;
  rules: RuleCatalog;
}): void {
  const ruleIdSet = new Set<string>();
  const alertIdSet = new Set<string>();
  for (const { rule_id, alert_id } of failure.alerts) {
    if (rule_id != null) ruleIdSet.add(rule_id);
    alertIdSet.add(alert_id);
  }
  const ruleIds = Array.from(ruleIdSet);
  const alertIds = Array.from(alertIdSet);
  const { refs, spillOver } = buildPolicyAndRuleRefs(
    failure.policyId,
    failure.spaceId,
    ruleIds,
    rules
  );

  eventLogService.logEvent(
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
        alert_count: alertIds.length,
        alert_ids: alertIds,
        rule_count: ruleIds.length,
        rule_ids: spillOver.length > 0 ? spillOver : undefined,
      },
    })
  );
}

/**
 * Aggregate dispatched groups into per-policy summaries, excluding workflow
 * destinations that recorded a DispatchFailure. Groups where every destination
 * failed are skipped entirely so they do not appear in the `dispatched` event.
 */
function aggregateByPolicy(
  groups: readonly ActionGroup[],
  outcome: DispatchOutcome
): Map<ActionPolicyId, PolicySummary> {
  const summaries = new Map<ActionPolicyId, PolicySummary>();
  for (const group of groups) {
    // Groups with at least one destination but no delivered destinations
    // (total failure) are skipped entirely — their alerts and rules are
    // already captured in `dispatch_failed` events and must not appear in the
    // `dispatched` summary.
    const delivered = outcome.deliveredDestinationsFor(group);

    if (group.destinations.length > 0 && delivered.length === 0) {
      // All destinations failed — skip this group entirely for this summary.
      continue;
    }

    let summary = summaries.get(group.policyId);
    if (!summary) {
      summary = {
        policyId: group.policyId,
        spaceId: group.spaceId,
        alertIds: new Set(),
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
    for (const executionId of outcome.executionIdsFor(group.id)) {
      summary.workflowExecutionIds.add(executionId);
    }
    for (const alert of group.alerts) {
      summary.alertIds.add(alert.alert_id);
      if (alert.rule_id != null) {
        summary.ruleIds.add(alert.rule_id);
      }
    }
  }
  return summaries;
}

function buildPolicyAndRuleRefs(
  policyId: ActionPolicyId,
  spaceId: string,
  ruleIds: string[],
  rules: RuleCatalog
): { refs: SavedObjectRef[]; spillOver: string[] } {
  const capped = ruleIds.slice(0, RULE_REF_CAP);
  const spillOver = ruleIds.slice(RULE_REF_CAP);
  const refs: SavedObjectRef[] = [
    policyRef({ id: policyId, spaceId }),
    ...capped.map((id) => ruleRef({ id, spaceId: rules.spaceIdOf(id) ?? spaceId })),
  ];
  return { refs, spillOver };
}

function aggregateUnmatchedBySubject(unmatched: readonly Alert[]): UnmatchedGroup[] {
  const bySubject = new Map<string, UnmatchedGroup>();
  for (const alert of unmatched) {
    const subject = alertSubject(alert);
    let group = bySubject.get(subject);
    if (!group) {
      group = {
        alertIds: new Set(),
        space_id: alert.space_id,
        ruleId: alert.rule_id,
      };
      bySubject.set(subject, group);
    }
    group.alertIds.add(alert.alert_id);
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
