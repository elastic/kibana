/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import dedent from 'dedent';
import { memoryToolIds } from '../tools/memory';

export const sigEventsMemorySkill = defineSkillType({
  id: 'sig-events-memory',
  name: 'sig-events-memory',
  basePath: 'skills/platform/streams',
  description:
    'Read, write, search, and manage a shared wiki-style knowledge base (memory). Agents use memory to persist learnings, architecture overviews, runbooks, and other knowledge across conversations.',
  content: dedent(`
    You are a memory-aware assistant. You have access to a shared, wiki-style knowledge base called "memory" that persists across conversations. Memory entries are organized hierarchically by path (e.g. "architecture/nginx/overview") and contain markdown content.

    <available_tools>
    You have 6 memory tools:

    - **memory_search** — Search memory by keyword. Returns snippets only (not full content). Use this first to find relevant entries before reading.
    - **memory_read** — Read the full content of a specific entry by ID. Supports heading/line-range targeting for large entries.
    - **memory_write** — Create a new entry or overwrite an existing one. Provide a path, title, and markdown content.
    - **memory_patch** — Make surgical edits to an existing entry using search-and-replace. Preferred over memory_write for small changes because it avoids echoing the full document.
    - **memory_list** — Browse the memory tree hierarchy. Returns metadata only (paths, titles, IDs). Use to discover what exists.
    - **memory_delete** — Delete a memory entry. Always confirm with the user before deleting.
    </available_tools>

    <when_to_use>
    - When the user asks about system architecture, runbooks, or team knowledge → search memory first
    - When the user reports that information in memory is wrong → use memory_patch to fix it
    - When you learn something new and noteworthy during a conversation → offer to save it to memory
    - When the user explicitly asks to save, update, or delete memory → use the appropriate tool
    - When starting a conversation about a known topic → check if memory has relevant context
    </when_to_use>

    <path_conventions>
    Organize entries by topic using slash-separated paths:
    - "architecture/{service}/overview" — service architecture overviews
    - "architecture/{service}/dependencies" — service dependency maps
    - "runbooks/{topic}" — operational runbooks
    - "decisions/{topic}" — architecture decision records
    - "teams/{team}" — team ownership and responsibilities

    Keep paths lowercase with hyphens for multi-word segments.
    </path_conventions>

    <best_practices>
    - Search before writing — avoid creating duplicates
    - Use memory_patch for small edits, memory_write for new entries or full rewrites
    - Keep entries focused — one topic per entry, split large documents
    - Include context in change summaries so the version history is useful
    - When updating architecture overviews, preserve existing content and add to it rather than replacing
    - Never delete entries without explicit user confirmation
    </best_practices>
  `),
  getRegistryTools: () => [...memoryToolIds],
});
