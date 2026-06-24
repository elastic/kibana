/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { ToolType } from '@kbn/agent-builder-common';
import type { MemoryToolsOptions } from '../../tools/memory/types';
import { createMemorySearchTool } from '../../tools/memory/memory_search';
import { createMemoryReadTool } from '../../tools/memory/memory_read';
import { createMemoryWriteTool } from '../../tools/memory/memory_write';
import { createMemoryPatchTool } from '../../tools/memory/memory_patch';
import { createMemoryListTool } from '../../tools/memory/memory_list';
import { createMemoryDeleteTool } from '../../tools/memory/memory_delete';
import { createSearchKnowledgeIndicatorsTool } from '../../tools/search_knowledge_indicators/tool';
import { toInlineMemoryTool, toInlineMemoryTools } from './to_inline_tools';
import description from './memory_synthesis.description.text';
import content from './memory_synthesis.skill.md.text';

export const createMemorySynthesisSkill = (options: MemoryToolsOptions) =>
  defineSkillType({
    id: 'streams-memory-synthesis',
    name: 'streams-memory-synthesis',
    basePath: 'skills/platform/streams',
    description,
    content,
    getInlineTools: () => {
      // Synthesis reads, searches, lists, writes, patches, and deletes so it can
      // prune stale/contradicting content — 6 tools + 1 KI tool = 7 total (limit: 7).
      const memoryTools = toInlineMemoryTools([
        createMemorySearchTool(options),
        createMemoryReadTool(options),
        createMemoryWriteTool(options),
        createMemoryPatchTool(options),
        createMemoryListTool(options),
        createMemoryDeleteTool(options),
      ]);

      const kiToolDefinition = createSearchKnowledgeIndicatorsTool({
        getScopedClients: options.getScopedClients,
        server: options.server,
        logger: options.logger,
      });

      if (kiToolDefinition.type !== ToolType.builtin) {
        throw new Error('Expected search knowledge indicators tool to be a builtin tool');
      }

      return [...memoryTools, { ...toInlineMemoryTool(kiToolDefinition), experimental: false }];
    },
  });
