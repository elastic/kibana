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

export const analyzeAndImproveSkill = defineSkillType({
  id: 'analyze-and-improve',
  name: 'analyze-and-improve',
  basePath: 'skills/platform/context-engine',
  experimental: true,
  description:
    'Decide what a Context Engine AI index should contain and whether what it contains is working. Load when setting up the Context Engine for a user\'s Elasticsearch data or connector sources, when choosing a Knowledge Indicator (KI) generation strategy, when handling an "Analyze & improve" hand-off, or when diagnosing why an index\'s KIs are not being retrieved and agents keep falling back to raw data. Directs to `context-engine-signals`, `ai-index-sources` and `ai-index-automations` for the mechanics.',
  content,
  // Read-only by construction. Skill tools are additive, so keeping the authoring and execution
  // tools in `ai-index-automations` is what lets an unattended analysis run load this skill without
  // gaining the ability to write.
  getRegistryTools: () => [
    platformCoreTools.executeEsql,
    platformCoreTools.listIndices,
    platformCoreTools.getIndexMapping,
    `${internalNamespaces.workflows}.get_workflow`,
  ],
});
