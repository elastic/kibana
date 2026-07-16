/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import content from './ki_workflow_generation.skill.md.text';
import { workflowTools } from '../../common/constants';

export const kiWorkflowGenerationSkill = defineSkillType({
  id: 'ki-workflow-generation',
  name: 'ki-workflow-generation',
  basePath: 'skills/platform/workflows',
  description:
    'Generate Kibana Workflows that build Knowledge Indicators (KIs) for a user\'s Elasticsearch data. Grounded in the "librarian" model: each KI both orients an agent to a class of information AND carries precomputed, parameterized, validated ES|QL "maps" to the live documents. Load when the user asks to make their data agent-queryable, generate KIs, or create an index-selection/KI-generation workflow.',
  experimental: true,
  content,
  getRegistryTools: () => [
    platformCoreTools.generateWorkflow,
    platformCoreTools.executeWorkflow,
    platformCoreTools.generateEsql,
    workflowTools.validateWorkflow,
    workflowTools.getStepDefinitions,
    workflowTools.getExamples,
    workflowTools.getConnectors,
  ],
});
