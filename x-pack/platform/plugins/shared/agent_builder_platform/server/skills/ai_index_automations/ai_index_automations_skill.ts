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
import { CONTEXT_ENGINE_UNIT_PROFILE_TEMPLATE } from '@kbn/workflows/managed';
import { kiShapesReference, strategyCatalogReference } from '../context_engine_shared';
import { contextEngineSkillAvailability } from '../context_engine_skill_availability';
import content from './ai_index_automations.skill.md.text';
import targetedKiWriterTemplateYaml from './targeted_ki_writer_template.yaml.text';

export const UNIT_PROFILE_TEMPLATE_NAME = 'unit-profile-template' as const;
export const TARGETED_KI_WRITER_TEMPLATE_NAME = 'targeted-ki-writer' as const;

export const aiIndexAutomationsSkill = defineSkillType({
  id: 'ai-index-automations',
  name: 'ai-index-automations',
  basePath: 'skills/platform/context-engine',
  experimental: true,
  availability: contextEngineSkillAvailability,
  description:
    'Read, draft and change the workflow automations that generate Knowledge Indicators for a Context Engine AI Index. Load when authoring a KI generation workflow, when inspecting what an existing automation does, when a proposed fix names a workflow step, or when validating or piloting an automation.',
  content,
  // The unit profile is the worked example for strategies with no template of their own, and it
  // is the same YAML the install tool renders, so the example cannot drift from what ships. The
  // targeted KI writer has no install path, so the skill still carries it. The KI shape and
  // strategy catalog are the shared references the analysis skill also reads, so the brief and
  // the template speak the same vocabulary.
  referencedContent: [
    {
      name: UNIT_PROFILE_TEMPLATE_NAME,
      relativePath: '.',
      content: CONTEXT_ENGINE_UNIT_PROFILE_TEMPLATE,
    },
    {
      name: TARGETED_KI_WRITER_TEMPLATE_NAME,
      relativePath: '.',
      content: targetedKiWriterTemplateYaml,
    },
    kiShapesReference,
    strategyCatalogReference,
  ],
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
