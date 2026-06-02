/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UpdateRuleData } from '@kbn/alerting-v2-schemas';
import type { KibanaRequest } from '@kbn/core-http-server';
import {
  buildRuleSnapshot,
  RuleCreatedTriggerId,
  RuleDeletedTriggerId,
  RuleDisabledTriggerId,
  RuleEnabledTriggerId,
  RuleUpdatedTriggerId,
  type RuleSnapshot,
} from '../../../common/workflows/triggers';
import type { RuleSavedObjectAttributes } from '../../saved_objects';
import type { WorkflowServiceContract } from '../services/workflow_service/workflow_service';
import type { RuleResponse } from '../rules_client/types';
import {
  emitRuleWorkflowEvent,
  emitRuleWorkflowEvents,
  toRuleLifecyclePayload,
} from './emit_rule_workflow_event';

export const createRuleWorkflowEmitter = (
  workflows: WorkflowServiceContract,
  request: KibanaRequest,
  spaceId: string
) => {
  const toSnapshots = (rules: RuleResponse[]): RuleSnapshot[] =>
    rules.map((rule) => buildRuleSnapshot(rule, spaceId));

  const emitForRules = async (triggerId: string, rules: RuleResponse[]) => {
    if (rules.length === 0) {
      return;
    }
    await emitRuleWorkflowEvent(
      workflows,
      request,
      triggerId,
      toRuleLifecyclePayload(toSnapshots(rules))
    );
  };

  return {
    emitCreated: (rule: RuleResponse) => emitForRules(RuleCreatedTriggerId, [rule]),
    emitUpdated: (rule: RuleResponse) => emitForRules(RuleUpdatedTriggerId, [rule]),
    emitDeleted: (rules: RuleResponse[]) => emitForRules(RuleDeletedTriggerId, rules),
    emitEnabled: (rules: RuleResponse[]) => emitForRules(RuleEnabledTriggerId, rules),
    emitDisabled: (rules: RuleResponse[]) => emitForRules(RuleDisabledTriggerId, rules),
    emitAfterUpdate: async (
      parsed: UpdateRuleData,
      existingAttrs: RuleSavedObjectAttributes,
      rule: RuleResponse
    ) => {
      if (Object.keys(parsed).length === 0) {
        return;
      }

      const payload = toRuleLifecyclePayload([buildRuleSnapshot(rule, spaceId)]);
      const events: Array<{
        triggerId: string;
        payload: ReturnType<typeof toRuleLifecyclePayload>;
      }> = [{ triggerId: RuleUpdatedTriggerId, payload }];

      if (parsed.enabled !== undefined && parsed.enabled !== existingAttrs.enabled) {
        events.push({
          triggerId: rule.enabled ? RuleEnabledTriggerId : RuleDisabledTriggerId,
          payload,
        });
      }

      await emitRuleWorkflowEvents(workflows, request, events);
    },
  };
};

export type RuleWorkflowEmitter = ReturnType<typeof createRuleWorkflowEmitter>;
