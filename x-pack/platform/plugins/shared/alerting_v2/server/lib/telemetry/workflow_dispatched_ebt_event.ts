/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts } from '@kbn/core/server';
import {
  WORKFLOW_DISPATCHED_EBT_EVENT_TYPE,
  type WorkflowDispatchedEbtData,
} from './workflow_ebt_schema';

export const workflowDispatchedTelemetryEvent: EventTypeOpts<WorkflowDispatchedEbtData> = {
  eventType: WORKFLOW_DISPATCHED_EBT_EVENT_TYPE,
  schema: {
    workflow_id: {
      type: 'keyword',
      _meta: {
        description: 'The id of the workflow that was dispatched.',
        optional: false,
      },
    },
    action_policy_id: {
      type: 'keyword',
      _meta: {
        description: 'The id of the action policy that triggered the dispatch.',
        optional: false,
      },
    },
    workflow_execution_id: {
      type: 'keyword',
      _meta: {
        description: 'The execution id assigned to this workflow run.',
        optional: false,
      },
    },
    space_id: {
      type: 'keyword',
      _meta: {
        description: 'The space the dispatch occurred in.',
        optional: false,
      },
    },
    rule_id: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description: 'A rule id whose alerts appear in this dispatch.',
        },
      },
      _meta: {
        description: 'Ids of every rule whose alerts appear in this dispatch.',
        optional: false,
      },
    },
    alert_count: {
      type: 'long',
      _meta: {
        description: 'Number of alerts included in this dispatch.',
        optional: false,
      },
    },
    rule_count: {
      type: 'long',
      _meta: {
        description: 'Number of distinct rules whose alerts appear in this dispatch.',
        optional: false,
      },
    },
    throttle_strategy: {
      type: 'keyword',
      _meta: {
        description:
          'The throttle strategy in effect for the action policy. Reflects the default when the policy sets none.',
        optional: false,
      },
    },
    grouping_mode: {
      type: 'keyword',
      _meta: {
        description:
          'How the action policy groups alerts. Reflects the default when the policy sets none.',
        optional: false,
      },
    },
  },
};

export interface WorkflowDispatchedEventInput {
  workflowId: string;
  actionPolicyId: string;
  workflowExecutionId: string;
  spaceId: string;
  ruleIds: readonly string[];
  alertCount: number;
  throttleStrategy: WorkflowDispatchedEbtData['throttle_strategy'];
  groupingMode: WorkflowDispatchedEbtData['grouping_mode'];
}

/** Projects a successful workflow dispatch into its telemetry payload. */
export const buildWorkflowDispatchedEventData = ({
  workflowId,
  actionPolicyId,
  workflowExecutionId,
  spaceId,
  ruleIds,
  alertCount,
  throttleStrategy,
  groupingMode,
}: WorkflowDispatchedEventInput): WorkflowDispatchedEbtData => {
  const distinctRuleIds = [...new Set(ruleIds)];

  return {
    workflow_id: workflowId,
    action_policy_id: actionPolicyId,
    workflow_execution_id: workflowExecutionId,
    space_id: spaceId,
    rule_id: distinctRuleIds,
    alert_count: alertCount,
    rule_count: distinctRuleIds.length,
    throttle_strategy: throttleStrategy,
    grouping_mode: groupingMode,
  };
};
