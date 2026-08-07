/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformMemoryTools } from '@kbn/agent-builder-common';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import description from './description.text';
import content from './skill.md.text';

export const AGENT_MEMORY_CONVERSATION_SCRAPER_SKILL_ID = 'agent-memory-conversation-scraper';

/**
 * Distils durable knowledge out of past conversations into pages — the mechanism
 * by which things learned in chat outlive the chat.
 */
export const createConversationScraperSkill = () =>
  defineSkillType({
    id: AGENT_MEMORY_CONVERSATION_SCRAPER_SKILL_ID,
    name: AGENT_MEMORY_CONVERSATION_SCRAPER_SKILL_ID,
    basePath: 'skills/platform/memory',
    excludeFromElasticCapabilities: true,
    description,
    content,
    getRegistryTools: () => Object.values(platformMemoryTools),
  });
