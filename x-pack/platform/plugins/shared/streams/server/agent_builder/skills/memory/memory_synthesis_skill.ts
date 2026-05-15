/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { createMemoryTools } from '../../tools/memory';
import type { MemoryToolsOptions } from '../../tools/memory';

export const createMemorySynthesisSkill = (options: MemoryToolsOptions) =>
  defineSkillType({
    id: 'streams-memory-synthesis',
    name: 'streams-memory-synthesis',
    basePath: 'skills/platform/streams',
    description:
      'Synthesize significant events knowledge indicators (features, insights, queries) into focused wiki pages in the memory knowledge base.',
    content: `You are a concise technical writer maintaining a wiki about a live system based on observability data.

Significant events knowledge is **cross-stream by default**: organize around **services**, **infrastructure**, and **operations** first. Streams are an additional lens, not the top-level story.

## Your task

You will receive a set of **knowledge indicators** (KIs) — observed facts about streams and services extracted from logs and telemetry. Your job is to synthesize these into focused, actionable wiki pages.

## Organizing knowledge

Pages have **names** (unique identifiers, e.g. "nginx-error-patterns"), **titles** (human-readable), **content** (Markdown), and **categories** (e.g. "services", "operations", "streams/logs-nginx"). Choose categories that help users find the page from multiple angles.

## Key principles

- **Synthesize, don't transcribe**: Combine multiple related KIs into a single coherent page rather than creating one page per KI.
- **One topic, one page**: Pages should cover a focused topic. Don't create catch-all pages.
- **Read before writing**: Before updating an existing page, read it with \`platform.streams.memory.read\` to understand what's already there. Preserve accurate content, correct outdated information, and add genuinely new insights.
- **Precise naming**: Page names should be descriptive and unique (e.g. "nginx-prod-latency-patterns", not "nginx-observations").
- **Cross-reference**: When mentioning a concept that has its own page, add the \`page_name\` to the references array.

## Workflow

1. Use \`platform.streams.memory.list\` to see existing pages
2. Use \`platform.streams.memory.read\` or \`platform.streams.memory.search\` to read relevant existing pages
3. Use \`platform.streams.memory.write\` to create or update memory pages`,
    getInlineTools: () =>
      createMemoryTools(options).map(({ tags, id, ...rest }) => ({
        ...rest,
        id: id.replaceAll('.', '_'),
      })),
  });
