/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltInAgentDefinition } from '@kbn/agent-builder-server/agents';
import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import instructions from './instructions/planner.md.text';

export const SIGEVENTS_RULE_ON_RULE_PLANNER_AGENT_ID =
  'platform.streams.significant-events.rule-on-rule.planner';

export const sigEventsRuleOnRulePlannerAgent = {
  id: SIGEVENTS_RULE_ON_RULE_PLANNER_AGENT_ID,
  name: 'Significant Events Rule-on-Rule Planner',
  description:
    'Analyzes a base alerting v2 signal rule ES|QL query and produces rule-on-rule CHANGE_POINT ES|QL for Significant Events change detection.',
  labels: ['observability', 'streams', 'significant-events', 'rule-on-rule', 'planner'],
  avatar_icon: 'logoElastic',
  configuration: {
    instructions,
    tools: [
      {
        tool_ids: [platformCoreTools.executeEsql],
      },
    ],
  },
} as const satisfies BuiltInAgentDefinition;
