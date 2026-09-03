/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import content from './analyze_and_improve.skill.md.text';
import indexSelectionReferenceYaml from './index_selection_reference.yaml.text';

export const analyzeAndImproveSkill = defineSkillType({
  id: 'analyze-and-improve',
  name: 'analyze-and-improve',
  basePath: 'skills/platform/context-engine',
  experimental: true,
  description:
    'Decide what a Context Engine AI index should contain and what workflow automation should produce it. Load when setting up the Context Engine for a user\'s Elasticsearch data or connector sources, when generating Knowledge Indicators (KIs), when drafting or editing a KI automation, when handling an "Analyze & improve" hand-off, or when diagnosing why an index\'s KIs are not being retrieved and agents keep falling back to raw data.',
  content,
  referencedContent: [
    {
      name: 'index-selection-reference-workflow',
      relativePath: '.',
      content: indexSelectionReferenceYaml,
    },
  ],
  // The union of what setting an index up and diagnosing one both need. Skill tools are additive
  // to the agent's own set, so binding the authoring tools here hands them to every agent that
  // loads this skill — an unattended analysis run must withhold them in its own configuration
  // rather than relying on the skill to stay read-only.
  getRegistryTools: () => [
    platformCoreTools.generateWorkflow,
    platformCoreTools.executeWorkflow,
    platformCoreTools.generateEsql,
    platformCoreTools.executeEsql,
    platformCoreTools.listIndices,
    platformCoreTools.getIndexMapping,
    platformCoreTools.getWorkflowExecutionStatus,
    `${internalNamespaces.workflows}.validate_workflow`,
    `${internalNamespaces.workflows}.get_workflow`,
    `${internalNamespaces.workflows}.get_step_definitions`,
    `${internalNamespaces.workflows}.get_examples`,
    `${internalNamespaces.workflows}.get_connectors`,
  ],
});
