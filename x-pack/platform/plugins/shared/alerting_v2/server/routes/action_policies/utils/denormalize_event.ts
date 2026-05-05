/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { IValidatedEvent } from '@kbn/event-log-plugin/server';
import { ACTION_POLICY_SAVED_OBJECT_TYPE, RULE_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import { ACTION_POLICY_EVENT_ACTIONS } from '../../../lib/dispatcher/steps/constants';

const namedRefSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
});

export const policyExecutionHistoryItemSchema = z.object({
  '@timestamp': z.string(),
  policy: namedRefSchema,
  rule: namedRefSchema,
  outcome: z.enum([ACTION_POLICY_EVENT_ACTIONS.DISPATCHED, ACTION_POLICY_EVENT_ACTIONS.THROTTLED]),
  episode_count: z.number(),
  action_group_count: z.number(),
  workflows: z.array(namedRefSchema),
});

export type PolicyExecutionHistoryItem = z.infer<typeof policyExecutionHistoryItemSchema>;

export type PolicyOutcome =
  | typeof ACTION_POLICY_EVENT_ACTIONS.DISPATCHED
  | typeof ACTION_POLICY_EVENT_ACTIONS.THROTTLED;

export interface NameMaps {
  policyNames: Map<string, string>;
  ruleNames: Map<string, string>;
  workflowNames: Map<string, string>;
}

export const isString = (v: unknown): v is string => typeof v === 'string';

export const isPolicyOutcome = (action: unknown): action is PolicyOutcome =>
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

export function denormalizeEvent(
  event: IValidatedEvent,
  { policyNames, ruleNames, workflowNames }: NameMaps
): PolicyExecutionHistoryItem[] {
  if (!event) return [];

  const timestamp = event['@timestamp'];
  const action = event.event?.action;
  if (!timestamp || !isPolicyOutcome(action)) return [];

  const savedObjects = event.kibana?.saved_objects ?? [];
  const policyId = savedObjects.find((so) => so.type === ACTION_POLICY_SAVED_OBJECT_TYPE)?.id;
  if (!policyId) return [];

  const dispatcher = event.kibana?.alerting_v2?.dispatcher ?? {};

  const referencedRuleIds = savedObjects
    .filter((so) => so.type === RULE_SAVED_OBJECT_TYPE)
    .map((so) => so.id);
  const allRuleIds = [...referencedRuleIds, ...(dispatcher.rule_ids ?? [])].filter(isString);

  const workflows = (dispatcher.workflow_ids ?? [])
    .filter(isString)
    .map((id) => ({ id, name: workflowNames.get(id) ?? null }));

  return allRuleIds.map((ruleId) => ({
    '@timestamp': timestamp,
    policy: { id: policyId, name: policyNames.get(policyId) ?? null },
    rule: { id: ruleId, name: ruleNames.get(ruleId) ?? null },
    outcome: action,
    episode_count: Number(dispatcher.episode_count ?? 0),
    action_group_count: Number(dispatcher.action_group_count ?? 0),
    workflows,
  }));
}
