/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltInAgentDefinition } from '@kbn/agent-builder-server/agents';
import { platformCoreTools, platformStreamsSigEventsTools } from '@kbn/agent-builder-common/tools';
import instructions from './instructions/judge.md.text';
import { OBSERVABILITY_GET_LOGS_TOOL_ID } from './constants';

export const SIGEVENTS_JUDGE_AGENT_ID = 'platform.streams.significant-events.discovery.judge';

export const sigEventsJudgeAgent = {
  id: SIGEVENTS_JUDGE_AGENT_ID,
  name: 'Significant Events Discovery Judge',
  description:
    'Reviews proposed discoveries and decides whether to promote, acknowledge, or demote a significant event.',
  labels: ['observability', 'streams', 'significant-events', 'discovery', 'judge'],
  avatar_icon: 'logoElastic',
  configuration: {
    instructions,
    tools: [
      {
        tool_ids: [
          platformStreamsSigEventsTools.searchKnowledgeIndicators,
          platformCoreTools.executeEsql,
          OBSERVABILITY_GET_LOGS_TOOL_ID,
        ],
      },
    ],
  },
} as const satisfies BuiltInAgentDefinition;
