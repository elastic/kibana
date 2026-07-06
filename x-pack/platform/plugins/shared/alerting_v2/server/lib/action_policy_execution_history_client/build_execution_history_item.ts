/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IValidatedEvent } from '@kbn/event-log-plugin/server';
import {
  MAX_EMBEDDED_RULES_PER_ITEM,
  type PolicyExecutionHistoryItem,
  type PolicyExecutionOutcome,
  type SearchMatchCounts,
} from '@kbn/alerting-v2-schemas';
import { ACTION_POLICY_SAVED_OBJECT_TYPE, RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { ACTION_POLICY_EVENT_ACTIONS } from '../dispatcher/steps/constants';

export type { PolicyExecutionHistoryItem };

export interface NameMaps {
  policyNames: Map<string, string>;
  ruleNames: Map<string, string>;
  workflowNames: Map<string, string>;
}

export interface ResolvedSearchIds {
  policyIds: string[];
  ruleIds: string[];
  hasMatches: boolean;
  matches: SearchMatchCounts | null;
}

export const isString = (v: unknown): v is string => typeof v === 'string';

export const isPolicyOutcome = (action: unknown): action is PolicyExecutionOutcome =>
  action === ACTION_POLICY_EVENT_ACTIONS.DISPATCHED ||
  action === ACTION_POLICY_EVENT_ACTIONS.THROTTLED;

export function collectIdsFromEvents(events: IValidatedEvent[]): {
  policyIds: string[];
  ruleIds: string[];
  workflowIds: string[];
} {
  const policyIds = new Set<string>();
  const ruleIds = new Set<string>();
  const workflowIds = new Set<string>();

  for (const event of events) {
    if (!event) continue;
    const savedObjects = event.kibana?.saved_objects ?? [];
    for (const so of savedObjects) {
      if (!isString(so.id)) continue;
      if (so.type === ACTION_POLICY_SAVED_OBJECT_TYPE) policyIds.add(so.id);
      else if (so.type === RULE_SAVED_OBJECT_TYPE) ruleIds.add(so.id);
    }
    const dispatcher = event.kibana?.alerting_v2?.dispatcher;
    for (const id of dispatcher?.rule_ids ?? []) {
      if (isString(id)) ruleIds.add(id);
    }
    for (const id of dispatcher?.workflow_ids ?? []) {
      if (isString(id)) workflowIds.add(id);
    }
  }

  return {
    policyIds: [...policyIds],
    ruleIds: [...ruleIds],
    workflowIds: [...workflowIds],
  };
}

/**
 * Returns the relevant rule IDs for a given log event, based on the resolved search IDs and the policy ID.
 * If search is not active (i.e., no matchingSearchIds), all rule IDs are relevant.
 * If the policy ID is in the resolved search IDs, all rule IDs are relevant.
 * If there are specific rule IDs in the resolved search IDs, only those are relevant.
 * Otherwise, no rule IDs are relevant.
 * @param policyId the ID of the policy for the current log event
 * @param allRuleIds all rule IDs referenced by the current log event
 * @param matchingSearchIds search IDs resolved from the search query, or undefined if no search is active
 * @returns an array of relevant rule IDs for the current log event
 */
export function getRelevantRuleIdsFromLogEvent(
  policyId: string,
  allRuleIds: string[],
  matchingSearchIds?: ResolvedSearchIds,
  mandatoryRuleIds?: string[]
): string[] {
  const searchNarrows =
    matchingSearchIds !== undefined && !matchingSearchIds.policyIds.includes(policyId);
  const mandatoryActive = mandatoryRuleIds !== undefined && mandatoryRuleIds.length > 0;

  if (!searchNarrows && !mandatoryActive) {
    return allRuleIds;
  }

  const relevantRuleIds = new Set<string>([
    ...(searchNarrows ? matchingSearchIds.ruleIds : []),
    ...(mandatoryActive ? mandatoryRuleIds : []),
  ]);

  return allRuleIds.filter((id) => relevantRuleIds.has(id));
}

/**
 * Builds an execution history item for a given log event.
 * @param event The validated log event
 * @param param1 An object containing name maps for policies, rules, and workflows
 * @param matchingSearchIds Used to decide which rules are relevant for the current
 * log event. A rule is relevant if it is search scoped, either because search is not active,
 * or because the rule, or its parent policy, is in the resolved search IDs.
 * @param mandatoryRuleIds An array of rule IDs. When provided, the resulting execution
 * history item will only include rules that are in this list. If undefined, all relevant
 * rules will be included.
 * @returns A policy execution history item or null if the event is not relevant
 */
export function buildExecutionHistoryItem(
  event: IValidatedEvent,
  { policyNames, ruleNames, workflowNames }: NameMaps,
  matchingSearchIds?: ResolvedSearchIds,
  mandatoryRuleIds?: string[]
): PolicyExecutionHistoryItem | null {
  if (!event || (matchingSearchIds && !matchingSearchIds.hasMatches)) {
    return null;
  }

  const timestamp = event['@timestamp'];
  const action = event.event?.action;
  if (!timestamp || !isPolicyOutcome(action)) return null;

  const savedObjects = event.kibana?.saved_objects ?? [];
  const policyId = savedObjects.find((so) => so.type === ACTION_POLICY_SAVED_OBJECT_TYPE)?.id;
  if (!policyId) return null;

  const dispatcher = event.kibana?.alerting_v2?.dispatcher ?? {};

  const referencedRuleIds = savedObjects
    .filter((so) => so.type === RULE_SAVED_OBJECT_TYPE)
    .map((so) => so.id);
  const allRuleIds = [...referencedRuleIds, ...(dispatcher.rule_ids ?? [])].filter(isString);
  const relevantRuleIds = getRelevantRuleIdsFromLogEvent(
    policyId,
    allRuleIds,
    matchingSearchIds,
    mandatoryRuleIds
  );
  if (relevantRuleIds.length === 0) return null;

  const totalRuleCount = relevantRuleIds.length;
  const rules = relevantRuleIds
    .slice(0, MAX_EMBEDDED_RULES_PER_ITEM)
    .map((id) => ({ id, name: ruleNames.get(id) ?? null }));

  const workflows = (dispatcher.workflow_ids ?? [])
    .filter(isString)
    .map((id) => ({ id, name: workflowNames.get(id) ?? null }));

  return {
    '@timestamp': timestamp,
    policy: { id: policyId, name: policyNames.get(policyId) ?? null },
    outcome: action,
    episode_count: Number(dispatcher.episode_count ?? 0),
    action_group_count: Number(dispatcher.action_group_count ?? 0),
    rules,
    totalRuleCount,
    workflows,
  };
}
