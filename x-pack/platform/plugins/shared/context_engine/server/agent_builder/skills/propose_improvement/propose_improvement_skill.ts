/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import {
  PROPOSE_IMPROVEMENT_SKILL_ID,
  contextEngineToolIds,
} from '../../../../common/agent_builder/constants';

const content = `# Propose an improvement

Resolve a detected failure **pattern** on an AI index by proposing one **improvement**.
Load this skill when a pattern attachment is present.

A pattern is a failure mode (type + sub-type) backed by a suite of comparable cases. It is
*not* tied to a single fix — pick the improvement that addresses the cause.

## Steps

1. **Read the pattern and the index.** The attachment carries the pattern (type, sub-type,
   evidence, representative trace ids). Call \`get_ai_index\` for the current sources and automations.
2. **Verify against the source.** Confirm the pattern is real against the raw data before changing
   anything. If it is not (e.g. the fact is absent from the source too), say so and stop — the
   automation is not at fault.
3. **Choose the improvement route by pattern type:**
   - \`coverage_gap\` / \`undeclared_source\` → the agent went to raw data with no KI. Propose a new
     KI-creation automation (\`generate_workflow\` → \`save_automation\`, no \`workflow_id\`), or a new
     declared source (\`update_ai_index\`).
   - \`missing_fact\` → an existing KI dropped a needed fact. Fix the extraction instructions of the
     owning \`managed\` automation (\`save_automation\` with its \`workflow_id\`).
   - \`empty_retrieval\` / \`query_error\` → the retrieval query was wrong for the intent. Improve the
     ES|QL guidance.
4. **Propose before applying.** Show the diff and the expected effect. Apply only on approval.
5. **One improvement per pattern.** A pattern may need several attempts over time; make one bounded
   change and let the next classifier run measure whether it held.

Only rewrite \`managed\` automations. Never claim a change works without running it.`;

/** Teaches the management agent to resolve a failure pattern into a concrete improvement. */
export const proposeImprovementSkill = defineSkillType({
  id: PROPOSE_IMPROVEMENT_SKILL_ID,
  name: 'propose-improvement',
  basePath: 'skills/platform/context-engine',
  experimental: true,
  description:
    'Resolve a detected Context Engine failure pattern by proposing one bounded improvement (fix an automation, add a source, or create a new KI template). Load when a pattern attachment is present.',
  content,
  getRegistryTools: () => [
    contextEngineToolIds.getAiIndex,
    contextEngineToolIds.updateAiIndex,
    contextEngineToolIds.saveAutomation,
    platformCoreTools.generateWorkflow,
    platformCoreTools.generateEsql,
    platformCoreTools.executeEsql,
    platformCoreTools.getIndexMapping,
  ],
});
