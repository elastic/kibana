/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import content from './ki_automation_generation.skill.md.text';
import indexSelectionReferenceYaml from './index_selection_reference.yaml.text';

export const kiAutomationGenerationSkill = defineSkillType({
  id: 'ki-automation-generation',
  name: 'ki-automation-generation',
  basePath: 'skills/platform/context-engine',
  experimental: true,
  description:
    "Set up the Context Engine for a user's Elasticsearch data or connector sources by generating Knowledge Indicators (KIs). Load when the user wants to make their data queryable by an AI agent, generate KIs, create a KI index, or set up the Context Engine.",
  content,
  referencedContent: [
    {
      name: 'index-selection-reference-workflow',
      relativePath: '.',
      content: indexSelectionReferenceYaml,
    },
  ],
  getRegistryTools: () => [
    platformCoreTools.generateWorkflow,
    platformCoreTools.executeWorkflow,
    platformCoreTools.generateEsql,
    platformCoreTools.executeEsql,
    platformCoreTools.listIndices,
    platformCoreTools.getIndexMapping,
    platformCoreTools.getWorkflowExecutionStatus,
    `${internalNamespaces.workflows}.validate_workflow`,
    `${internalNamespaces.workflows}.get_step_definitions`,
    `${internalNamespaces.workflows}.get_examples`,
    `${internalNamespaces.workflows}.get_connectors`,
  ],
});
