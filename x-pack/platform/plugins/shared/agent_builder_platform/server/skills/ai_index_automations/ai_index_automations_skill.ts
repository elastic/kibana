/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import content from './ai_index_automations.skill.md.text';
import indexSelectionReferenceYaml from './index_selection_reference.yaml.text';

export const aiIndexAutomationsSkill = defineSkillType({
  id: 'ai-index-automations',
  name: 'ai-index-automations',
  basePath: 'skills/platform/context-engine',
  experimental: true,
  description:
    'Read, draft and change the workflow automations that generate Knowledge Indicators for a Context Engine AI index. Load when authoring a KI generation workflow, when inspecting what an existing automation does, when a proposed fix names a workflow step, or when validating or piloting an automation.',
  content,
  referencedContent: [
    {
      name: 'index-selection-reference-workflow',
      relativePath: '.',
      content: indexSelectionReferenceYaml,
    },
  ],
  // This is the skill that holds the authoring and execution tools. Skill tools are additive, so
  // an agent that only diagnoses an index loads `analyze-and-improve` and stays read-only; loading
  // this one is what grants the ability to write.
  getRegistryTools: () => [
    platformCoreTools.generateWorkflow,
    platformCoreTools.executeWorkflow,
    platformCoreTools.getWorkflowExecutionStatus,
    platformCoreTools.generateEsql,
    platformCoreTools.executeEsql,
    `${internalNamespaces.workflows}.validate_workflow`,
    `${internalNamespaces.workflows}.get_workflow`,
    `${internalNamespaces.workflows}.get_step_definitions`,
    `${internalNamespaces.workflows}.get_examples`,
    `${internalNamespaces.workflows}.get_connectors`,
  ],
});
