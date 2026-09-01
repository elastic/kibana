/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { createMemoryTools } from '../../tools/memory';
import type { MemoryToolsOptions } from '../../tools/memory';
import { toInlineMemoryTools } from './to_inline_tools';
import description from './conversation_scraper.description.text';
import content from './conversation_scraper.skill.md.text';

export const createConversationScraperSkill = (options: MemoryToolsOptions) =>
  defineSkillType({
    id: 'streams-conversation-scraper',
    name: 'streams-conversation-scraper',
    basePath: 'skills/platform/streams',
    excludeFromElasticCapabilities: true,
    description,
    content,
    getInlineTools: () => toInlineMemoryTools(createMemoryTools(options)),
  });
