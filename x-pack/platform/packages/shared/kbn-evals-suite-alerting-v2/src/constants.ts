/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';

export {
  ALERTING_TOOL_IDS,
  CREATE_WITH_AGENT_INITIAL_PROMPT,
  RULE_MANAGEMENT_SKILL_ID,
} from '@kbn/alerting-v2-constants';

/**
 * Security detection-rule skill that commonly competes with Alerting V2
 * "create an alerting rule" prompts. Kept as a distractor id for routing evals.
 *
 * Mirrors `detection-rule-edit` in security_solution
 * (`server/agent_builder/skills/detection_rule_edit`).
 */
export const DETECTION_RULE_EDIT_SKILL_ID = 'detection-rule-edit';

/**
 * Skill id for the workflows-authoring skill the rule-management skill loads
 * during the "Default Notification Setup" flow (Part 3): "Load the
 * `workflow-authoring` skill via `filestore.read` (path:
 * `skills/platform/workflows`)".
 *
 * Mirrors `workflowAuthoringSkill` in agent_builder_workflows
 * (`server/skills/workflow_authoring_skill.ts`). Keep this value in sync with
 * the plugin — exporting it from that package is a decision for the owning team.
 */
export const WORKFLOW_AUTHORING_SKILL_ID = 'workflow-authoring';

/**
 * Built-in Agent Builder tool that returns an index's field types/mappings —
 * the "field cap"-style tool the agent uses to confirm real field names before
 * composing an ES|QL query. Sourced from `@kbn/agent-builder-common` so the id
 * never drifts from the platform tools.
 */
export const INDEX_MAPPING_TOOL_ID = platformCoreTools.getIndexMapping;

/**
 * Built-in Agent Builder index-discovery tools — either of these locates/enumerates
 * the target index (semantic `index_explorer` or deterministic `list_indices`).
 * A grounded compose flow is expected to use one of them in addition to
 * {@link INDEX_MAPPING_TOOL_ID}. Sourced from `@kbn/agent-builder-common`.
 */
export const INDEX_DISCOVERY_TOOL_IDS = [
  platformCoreTools.indexExplorer,
  platformCoreTools.listIndices,
] as const;

/**
 * Built-in Agent Builder tool that generates a workflow YAML draft. The
 * rule-management skill's notification setup (Part 3) instructs the agent to
 * create the default notification workflow with this tool (passing a UUID
 * `workflowId`) before wiring it as an action-policy destination. Sourced from
 * `@kbn/agent-builder-common` so the id never drifts from the platform tools.
 */
export const WORKFLOW_GENERATION_TOOL_ID = platformCoreTools.generateWorkflow;
