/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltInAgentDefinition } from '@kbn/agent-builder-server/agents';
import { platformCoreTools, platformStreamsSigEventsTools } from '@kbn/agent-builder-common/tools';
import instructions from './instructions/investigator.md.text';
import { OBSERVABILITY_GET_LOGS_TOOL_ID } from './constants';

export const SIGEVENTS_INVESTIGATOR_AGENT_ID =
  'platform.streams.significant-events.discovery.investigator';

export const sigEventsInvestigatorAgent = {
  id: SIGEVENTS_INVESTIGATOR_AGENT_ID,
  name: 'Significant Events Investigator',
  description:
    'Triages statistical detection signals across rules, correlates related detections into incident candidates using shared infrastructure, temporal proximity, and causal plausibility, and drafts structured discovery documents with root-cause hypotheses and supporting evidence.',
  labels: ['observability', 'streams', 'significant-events', 'discovery', 'investigator'],
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
