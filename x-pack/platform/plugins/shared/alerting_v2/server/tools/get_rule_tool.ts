/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { z } from '@kbn/zod/v4';
import { RULE_SAVED_OBJECT_TYPE } from '../saved_objects';
import { alertingTools } from './get_episode_events_tool';

const schema = z.object({
  rule_id: z.string().describe('The rule ID to look up'),
});

export const getAlertingRuleTool: BuiltinToolDefinition<typeof schema> = {
  id: alertingTools.getRule,
  type: ToolType.builtin,
  description: `Retrieve an alerting v2 rule definition by its ID.

Returns the full rule configuration including name, description, tags, kind (alert/signal), ES|QL query, schedule, grouping fields, state transition settings, and recovery policy.

**When to use:** To understand what a rule is monitoring, how it's configured, and what query it evaluates — e.g. when investigating an episode and you need to understand the detection logic.`,
  tags: ['alerting', 'rules'],
  schema,
  handler: async ({ rule_id: ruleId }, { esClient, events }) => {
    events.reportProgress(`Looking up rule ${ruleId}...`);

    const response = await esClient.asCurrentUser.get(
      {
        index: ALERTING_CASES_SAVED_OBJECT_INDEX,
        id: `${RULE_SAVED_OBJECT_TYPE}:${ruleId}`,
      },
      { ignore: [404] }
    );

    if (!response.found) {
      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              rule_id: ruleId,
              message: `Rule with id "${ruleId}" not found`,
            },
          },
        ],
      };
    }

    const source = response._source as Record<string, unknown>;
    const attrs = source[RULE_SAVED_OBJECT_TYPE] as Record<string, unknown>;

    if (!attrs) {
      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              rule_id: ruleId,
              message: `Rule with id "${ruleId}" not found`,
            },
          },
        ],
      };
    }

    const metadata = attrs.metadata as Record<string, unknown> | undefined;
    const schedule = attrs.schedule as Record<string, unknown> | undefined;
    const evaluation = attrs.evaluation as Record<string, unknown> | undefined;
    const query = evaluation?.query as Record<string, unknown> | undefined;
    const grouping = attrs.grouping as Record<string, unknown> | undefined;

    const rule = {
      id: ruleId,
      kind: attrs.kind,
      enabled: attrs.enabled,
      name: metadata?.name,
      description: metadata?.description,
      owner: metadata?.owner,
      tags: metadata?.tags,
      time_field: attrs.time_field,
      schedule: {
        every: schedule?.every,
        lookback: schedule?.lookback,
      },
      query: query?.base,
      state_transition: attrs.state_transition,
      recovery_policy: attrs.recovery_policy,
      grouping_fields: grouping?.fields,
      no_data: attrs.no_data,
      created_by: attrs.createdBy,
      created_at: attrs.createdAt,
      updated_by: attrs.updatedBy,
      updated_at: attrs.updatedAt,
    };

    return {
      results: [
        {
          type: ToolResultType.other,
          data: rule,
        },
      ],
    };
  },
};
