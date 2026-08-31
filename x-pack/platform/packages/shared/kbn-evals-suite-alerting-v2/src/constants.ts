/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';

export {
  ACTION_POLICY_MANAGEMENT_SKILL_ID,
  ALERTING_TOOL_IDS,
  CREATE_WITH_AGENT_INITIAL_PROMPT,
  RULE_MANAGEMENT_SKILL_ID,
  RUNBOOK_ARTIFACT_TYPE,
} from '@kbn/alerting-v2-constants';

/** Attachment type for workflow YAML drafts produced by `generate_workflow`. */
export const WORKFLOW_YAML_ATTACHMENT_TYPE = 'workflow.yaml';

export const DETECTION_RULE_EDIT_SKILL_ID = 'detection-rule-edit';

export const WORKFLOW_AUTHORING_SKILL_ID = 'workflow-authoring';

export const INDEX_MAPPING_TOOL_ID = platformCoreTools.getIndexMapping;

export const WORKFLOW_GENERATION_TOOL_ID = platformCoreTools.generateWorkflow;

export const INDEX_DISCOVERY_TOOL_IDS = [
  platformCoreTools.indexExplorer,
  platformCoreTools.listIndices,
] as const;
