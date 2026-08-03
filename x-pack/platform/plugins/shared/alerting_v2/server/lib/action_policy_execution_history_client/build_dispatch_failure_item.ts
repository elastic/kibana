/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IValidatedEvent } from '@kbn/event-log-plugin/server';
import {
  MAX_EMBEDDED_RULES_PER_ITEM,
  MAX_EMBEDDED_EPISODES_PER_ITEM,
  type DispatchFailureItem,
} from '@kbn/alerting-v2-schemas';
import { ACTION_POLICY_SAVED_OBJECT_TYPE, RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { isString } from './build_execution_history_item';

export const buildDispatchFailureItem = (
  event: IValidatedEvent,
  policyNames: Map<string, string>,
  ruleNames: Map<string, string>,
  workflowNames: Map<string, string>
): DispatchFailureItem | null => {
  if (!event) return null;

  const timestamp = event['@timestamp'];
  const executionUuid = event.kibana?.alerting_v2?.dispatcher?.execution?.uuid;
  const failureReason = event.kibana?.alerting_v2?.dispatcher?.failure_reason;
  const errorMessage = event.error?.message;

  if (!timestamp || !executionUuid || !failureReason || !errorMessage) return null;

  const savedObjects = event.kibana?.saved_objects ?? [];
  const policyId = savedObjects.find((so) => so.type === ACTION_POLICY_SAVED_OBJECT_TYPE)?.id;
  if (!policyId || !isString(policyId)) return null;

  const dispatcher = event.kibana?.alerting_v2?.dispatcher ?? {};

  // Rule ids: saved_objects refs + spill-over tail
  const refRuleIds = savedObjects
    .filter((so) => so.type === RULE_SAVED_OBJECT_TYPE)
    .map((so) => so.id)
    .filter(isString);
  const spilloverRuleIds = (dispatcher.rule_ids ?? []).filter(isString);
  const allRuleIds = [...refRuleIds, ...spilloverRuleIds];
  const totalRuleCount = allRuleIds.length;
  const rules = allRuleIds
    .slice(0, MAX_EMBEDDED_RULES_PER_ITEM)
    .map((id) => ({ id, name: ruleNames.get(id) ?? null }));

  const actionGroupId = (dispatcher.action_group_ids ?? [])[0];
  const workflowId = (dispatcher.workflow_ids ?? [])[0];
  if (!isString(actionGroupId) || !isString(workflowId)) return null;

  const episodeIds = (dispatcher.episode_ids ?? []).filter(isString);
  const episodeCount = Number(dispatcher.episode_count ?? episodeIds.length);
  const episodes = episodeIds.slice(0, MAX_EMBEDDED_EPISODES_PER_ITEM).map((id) => ({ id }));

  return {
    dispatched_at: timestamp,
    execution_uuid: String(executionUuid),
    failure_reason: failureReason as DispatchFailureItem['failure_reason'],
    error: { message: String(errorMessage) },
    policy: { id: policyId, name: policyNames.get(policyId) ?? null },
    action_group: { id: actionGroupId },
    workflow: { id: workflowId, name: workflowNames.get(workflowId) ?? null },
    episodes,
    episode_count: episodeCount,
    rules,
    totalRuleCount,
  };
};
