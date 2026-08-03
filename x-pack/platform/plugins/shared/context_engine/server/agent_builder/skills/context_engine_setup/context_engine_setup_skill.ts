/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import {
  CONTEXT_ENGINE_SETUP_SKILL_ID,
  contextEngineToolIds,
} from '../../../../common/agent_builder/constants';

const content = `# Context Engine setup

Generate and maintain the **KI-creation automations** of an AI index.

Load this skill when an AI index is attached and the user wants to set up, review,
or fix how its knowledge items (KIs) are built.

## The AI index

A registry entry, not a store. It records:

- \`dest\` — where KIs are written
- \`sources\` — ES|QL queries describing the raw data KIs are built from
- \`automations\` — KI-creation workflows (role \`ki_creation\`), each marked \`managed\` when you own it
- \`self_improvement\` — the trace index the feedback loop learns from, when enabled

## Tools

- \`get_ai_index\` — read current state. Call it first, and again after every write.
- \`update_ai_index\` — change the description, sources, or self-improvement config.
- \`save_automation\` — persist a workflow and link it as a managed \`ki_creation\` automation in one step.

\`generate_workflow\` only drafts a definition; nothing is stored until you call \`save_automation\`.
Pass \`workflow_id\` to overwrite an existing automation instead of adding a duplicate.

## How to work

1. **Read the index.** Every KI-creation automation must write to \`dest\`.
2. **Understand the sources.** Sources are ES|QL — run them with \`execute_esql\` (small LIMIT) to
   see the real data before proposing how to extract from it. Load the \`ki-automation-generation\`
   skill for the KI schema, granularity, and workflow shapes.
3. **Propose before building.** Say which sources you'll cover and the strategy for each. One
   automation per source-and-strategy pair keeps them separately debuggable.
4. **Pilot, then expand.** Draft, validate, run over a handful of documents, inspect the KIs in
   \`dest\`, and only widen once the output is right.
5. **Save** with \`save_automation\`, then confirm what was linked.

Only rewrite automations marked \`managed\`. Never claim an automation works without running it.`;

/** Teaches the management agent to turn declared sources into KI-creation automations. */
export const contextEngineSetupSkill = defineSkillType({
  id: CONTEXT_ENGINE_SETUP_SKILL_ID,
  name: 'context-engine-setup',
  basePath: 'skills/platform/context-engine',
  experimental: true,
  description:
    'Generate and maintain the KI-creation automations of a Context Engine AI index from its declared sources. Load when an AI index is attached and the user wants to set up, review, or fix how KIs are built.',
  content,
  getRegistryTools: () => [
    contextEngineToolIds.getAiIndex,
    contextEngineToolIds.updateAiIndex,
    contextEngineToolIds.saveAutomation,
    platformCoreTools.generateWorkflow,
    platformCoreTools.executeWorkflow,
    platformCoreTools.generateEsql,
    platformCoreTools.executeEsql,
    platformCoreTools.listIndices,
    platformCoreTools.getIndexMapping,
  ],
});
