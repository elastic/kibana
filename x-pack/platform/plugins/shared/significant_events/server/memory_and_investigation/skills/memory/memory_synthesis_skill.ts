/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformMemoryTools, platformSignificantEventsTools } from '@kbn/agent-builder-common';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import description from './memory_synthesis.description.text';
import content from './memory_synthesis.skill.md.text';

/**
 * Turns knowledge indicators into memory pages.
 *
 * Stays in this plugin because it is written against KI search; the memory tools
 * themselves are owned by the agent_memory plugin and requested here as registry
 * ids, so they resolve (and honour availability) without a plugin dependency.
 */
export const createMemorySynthesisSkill = () =>
  defineSkillType({
    id: 'streams-memory-synthesis',
    name: 'streams-memory-synthesis',
    basePath: 'skills/platform/streams',
    excludeFromElasticCapabilities: true,
    description,
    content,
    getRegistryTools: () => [
      platformMemoryTools.search,
      platformMemoryTools.read,
      platformMemoryTools.write,
      platformMemoryTools.list,
      platformSignificantEventsTools.searchKnowledgeIndicators,
    ],
  });
