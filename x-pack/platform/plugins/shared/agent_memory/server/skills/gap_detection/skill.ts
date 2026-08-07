/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformMemoryTools, platformSignificantEventsTools } from '@kbn/agent-builder-common';
import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import content from './skill.md.text';

export const AGENT_MEMORY_GAP_DETECTION_SKILL_ID = 'agent-memory-gap-detection';

/**
 * Tools this skill uses opportunistically to judge coverage.
 *
 * Referenced as plain registry ids, so on a deployment where the owning feature
 * is absent or unavailable the tool is simply filtered out and the audit degrades
 * instead of failing. That is also what keeps this plugin free of dependencies on
 * significant_events, streams, and workflows.
 */
const CONTEXT_TOOL_IDS = [
  platformSignificantEventsTools.searchKnowledgeIndicators,
  `${internalNamespaces.platformStreams}.inspect_streams`,
  `${internalNamespaces.workflows}.get_connectors`,
];

export const createGapDetectionSkill = () =>
  defineSkillType({
    id: AGENT_MEMORY_GAP_DETECTION_SKILL_ID,
    name: AGENT_MEMORY_GAP_DETECTION_SKILL_ID,
    basePath: 'skills/platform/memory',
    excludeFromElasticCapabilities: true,
    description:
      'Audits the memory knowledge base against the knowledge dimensions an agent needs for ' +
      'incident response, then writes a gaps page stating what is known, partial, and missing.',
    content,
    getRegistryTools: () => [...Object.values(platformMemoryTools), ...CONTEXT_TOOL_IDS],
  });
