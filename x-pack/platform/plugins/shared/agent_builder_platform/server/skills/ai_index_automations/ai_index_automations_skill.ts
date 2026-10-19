/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import {
  contextEngineAiIndexTools,
  contextEngineAutomationTools,
  platformCoreTools,
} from '@kbn/agent-builder-common/tools';
import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import { kiShapesReference, strategyCatalogReference } from '../context_engine_shared';
import { contextEngineSkillAvailability } from '../context_engine_skill_availability';
import content from './ai_index_automations.skill.md.text';

export const aiIndexAutomationsSkill = defineSkillType({
  id: 'ai-index-automations',
  name: 'ai-index-automations',
  basePath: 'skills/platform/context-engine',
  availability: contextEngineSkillAvailability,
  description:
    'Read, draft and change the workflow automations that generate Knowledge Indicators for a Context Engine AI Index. Load when authoring a KI generation workflow, when inspecting what an existing automation does, when a proposed fix names a workflow step, or when validating or piloting an automation.',
  content,
  // The KI shape and strategy catalog are the shared references the analysis skill also reads,
  // so the brief and the templates speak the same vocabulary.
  referencedContent: [kiShapesReference, strategyCatalogReference],
  getRegistryTools: () => [
    platformCoreTools.executeWorkflow,
    platformCoreTools.getWorkflowExecutionStatus,
    platformCoreTools.generateEsql,
    platformCoreTools.executeEsql,
    contextEngineAiIndexTools.queryAiIndices,
    `${internalNamespaces.workflows}.validate_workflow`,
    `${internalNamespaces.workflows}.get_workflow`,
    `${internalNamespaces.workflows}.get_step_definitions`,
    `${internalNamespaces.workflows}.get_trigger_definitions`,
    `${internalNamespaces.workflows}.get_examples`,
    `${internalNamespaces.workflows}.workflow_execute_step`,
    contextEngineAutomationTools.installAutomationTemplate,
    contextEngineAutomationTools.saveAutomation,
    contextEngineAutomationTools.runAutomation,
  ],
});
