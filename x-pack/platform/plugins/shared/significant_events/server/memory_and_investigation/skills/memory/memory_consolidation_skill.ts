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
import description from './memory_consolidation.description.text';
import content from './memory_consolidation.skill.md.text';

export const createMemoryConsolidationSkill = (options: MemoryToolsOptions) =>
  defineSkillType({
    id: 'streams-memory-consolidation',
    name: 'streams-memory-consolidation',
    basePath: 'skills/platform/streams',
    excludeFromElasticCapabilities: true,
    description,
    content,
    getInlineTools: () => toInlineMemoryTools(createMemoryTools(options)),
  });
