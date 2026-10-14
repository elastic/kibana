/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { contextEngineAiIndexTools, platformCoreTools } from '@kbn/agent-builder-common/tools';
import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import { kiShapesReference, strategyCatalogReference } from '../context_engine_shared';
import { contextEngineSkillAvailability } from '../context_engine_skill_availability';
import content from './analyze_and_improve.skill.md.text';

export const analyzeAndImproveSkill = defineSkillType({
  id: 'analyze-and-improve',
  name: 'analyze-and-improve',
  basePath: 'skills/platform/context-engine',
  experimental: true,
  availability: contextEngineSkillAvailability,
  description:
    'Decide what a Context Engine AI index should contain and whether what it contains is working. Load when setting up the Context Engine for a user\'s Elasticsearch data or connector sources, when choosing a Knowledge Indicator (KI) generation strategy, when handling an "Analyze & improve" hand-off, or when diagnosing why an index\'s KIs are not being retrieved and agents keep falling back to raw data. Directs to `context-engine-signals`, `ai-index-sources` and `ai-index-automations` for the mechanics.',
  content,
  // The KI shape and the strategy catalog are shared with the two mechanics skills, so each is
  // written once and read from here rather than restated in three bodies that drift apart.
  referencedContent: [kiShapesReference, strategyCatalogReference],
  // Read-only by construction. Skill tools are additive, so keeping the authoring and execution
  // tools in `ai-index-automations` is what lets an unattended analysis run load this skill without
  // gaining the ability to write.
  getRegistryTools: () => [
    platformCoreTools.executeEsql,
    platformCoreTools.listIndices,
    platformCoreTools.getIndexMapping,
    // Space-scoped reads of the KIs themselves.
    contextEngineAiIndexTools.listAiIndices,
    contextEngineAiIndexTools.describeAiIndex,
    contextEngineAiIndexTools.queryAiIndices,
    `${internalNamespaces.workflows}.get_workflow`,
  ],
});
