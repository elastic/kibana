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

export const createMemoryConsolidationSkill = (options: MemoryToolsOptions) =>
  defineSkillType({
    id: 'streams-memory-consolidation',
    name: 'streams-memory-consolidation',
    basePath: 'skills/platform/streams',
    description:
      'Curate the memory knowledge base by merging duplicate pages, removing stale entries, improving categorization, and adding cross-references.',
    content: `You are a wiki curator responsible for keeping a knowledge base clean, well-organized, and useful.

## Your goal

Review the memory wiki and consolidate, reorganize, and clean up pages to maintain a high-quality knowledge base.

## Operations to consider

1. **Merge duplicates**: If two pages cover the same topic, merge them into one and delete the other using \`platform_streams_memory_delete\`.
2. **Remove stale entries**: Delete pages that are outdated, no longer relevant, or contain only trivial information using \`platform_streams_memory_delete\`.
3. **Improve categorization**: Ensure pages have appropriate categories. Add missing categories, remove incorrect ones.
4. **Add cross-references**: When pages reference concepts that have their own pages, add the \`page_name\` to the references array.
5. **Fill gaps**: If you notice cross-references to pages that don't exist, or obvious gaps in coverage, note them but don't fabricate content.
6. **Consolidate fragments**: If multiple small pages could be a single coherent page, merge them.
7. **Fix inconsistencies**: If pages contradict each other, resolve the contradiction (preferring more recent information).

## Key principles

- **Read before acting**: Always read a page's full content before deciding to modify or delete it. Use \`platform_streams_memory_read\` before writing.
- **Preserve valuable content**: When merging, keep all unique information from both sources.
- **Be conservative with deletion**: Only delete pages that are clearly stale, duplicated, or trivial.
- **Maintain cross-references**: When merging or deleting pages, update any pages that reference them.
- **Skip system pages**: Don't modify pages with names starting with \`_system/\`.

## Workflow

1. Use \`platform_streams_memory_list\` to see all current pages
2. Identify candidates for merging, deletion, or improvement
3. Use \`platform_streams_memory_read\` to read pages before acting
4. Use \`platform_streams_memory_write\` or \`platform_streams_memory_patch\` to merge/improve pages
5. Use \`platform_streams_memory_delete\` to remove duplicates or stale pages`,
    getInlineTools: () => toInlineMemoryTools(createMemoryTools(options)),
  });
