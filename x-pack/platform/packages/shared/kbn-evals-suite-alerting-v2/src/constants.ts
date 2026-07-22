/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';

/**
 * Tool ids exposed by the Alerting V2 rule-management skill.
 *
 * These mirror the constants defined in the alerting_v2 plugin
 * (`server/agent_builder/common/constants.ts`). They are duplicated here on
 * purpose: that file lives under the plugin's `server` path and is not a public
 * package export, so importing it into a test package would couple this suite to
 * plugin internals. Keep these values in sync with the plugin.
 */
export const ALERTING_TOOL_IDS = {
  manageRule: 'platform.alerting.manage_rule',
  manageActionPolicy: 'platform.alerting.manage_action_policy',
} as const;

/**
 * Skill id for the Alerting V2 rule-management skill.
 *
 * Mirrors `createRuleManagementSkill` in the alerting_v2 plugin
 * (`server/agent_builder/skills/rule_management_skill.ts`). Duplicated here for
 * the same reason as {@link ALERTING_TOOL_IDS}: the plugin server path is not a
 * public package export.
 */
export const RULE_MANAGEMENT_SKILL_ID = 'rule-management';

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
 * (`server/skills/workflow_authoring_skill.ts`). Duplicated here for the same
 * reason as {@link ALERTING_TOOL_IDS}: the plugin server path is not a public
 * package export. Keep this value in sync with the plugin.
 */
export const WORKFLOW_AUTHORING_SKILL_ID = 'workflow-authoring';

/**
 * Initial message sent to the Agent Builder when the user clicks "Create with
 * AI Agent" on the Alerting V2 rules list page / create-rule flyout.
 *
 * Mirrors `CREATE_WITH_AGENT_INITIAL_PROMPT` in the alerting_v2 plugin
 * (`public/constants.ts`). Duplicated here for the same reason as
 * {@link ALERTING_TOOL_IDS}: the plugin path is not a public package export.
 * Keep this value in sync with the plugin — the eval exercises the exact
 * prompt the UI sends.
 */
export const CREATE_WITH_AGENT_INITIAL_PROMPT =
  'Load the rule-management skill and help me create a new alerting v2 rule. Ask me what I want to monitor and guide me through the setup.';

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
