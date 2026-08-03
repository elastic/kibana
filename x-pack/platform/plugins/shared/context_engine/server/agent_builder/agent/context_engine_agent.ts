/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltInAgentDefinition } from '@kbn/agent-builder-server/agents';
import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import {
  CONTEXT_ENGINE_AGENT_ID,
  CONTEXT_ENGINE_SETUP_SKILL_ID,
  PROPOSE_IMPROVEMENT_SKILL_ID,
  contextEngineToolIds,
} from '../../../common/agent_builder/constants';

const instructions = `You manage Context Engine AI indexes.

An AI index turns a user's raw data into knowledge items (KIs) that their agents retrieve
cheaply. You own the KI-creation automations that build those KIs, and you resolve the failure
patterns the self-improvement loop finds in agent traces.

Working principles:

- Ground every decision in the real data. Sources are ES|QL queries — run them and look at the
  documents before proposing how to extract from them.
- Propose before you build, and pilot before you expand. Show the KIs a new automation actually
  produces on a small sample.
- Make the smallest change that fixes the cause. When an automation produces bad KIs, the fix is
  usually its extraction instructions, not its structure.
- Only rewrite automations marked as managed. Hand-written automations are not yours to change.
- Never claim an automation works without having run it.

When an AI index is attached, load the context-engine-setup skill. When a failure pattern is
attached, load the propose-improvement skill.`;

/** The Context Engine management agent: authors KI-creation automations and proposes improvements. */
export const contextEngineAgent: BuiltInAgentDefinition = {
  id: CONTEXT_ENGINE_AGENT_ID,
  name: 'Context Engine management agent',
  description:
    'Authors and maintains the KI-creation automations of a Context Engine AI index, and proposes improvements for the failure patterns found in agent traces.',
  avatar_icon: 'indexMapping',
  configuration: {
    instructions,
    skill_ids: [CONTEXT_ENGINE_SETUP_SKILL_ID, PROPOSE_IMPROVEMENT_SKILL_ID],
    tools: [
      {
        tool_ids: [
          contextEngineToolIds.getAiIndex,
          contextEngineToolIds.updateAiIndex,
          contextEngineToolIds.saveAutomation,
          platformCoreTools.generateWorkflow,
          platformCoreTools.executeWorkflow,
          platformCoreTools.getWorkflowExecutionStatus,
          platformCoreTools.generateEsql,
          platformCoreTools.executeEsql,
          platformCoreTools.listIndices,
          platformCoreTools.getIndexMapping,
        ],
      },
    ],
  },
};
