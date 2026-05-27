/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import type { SkillBoundedTool } from '@kbn/agent-builder-server/skills/tools';
import {
  createMemorySearchTool,
  createMemoryReadTool,
  createMemoryWriteTool,
  createMemoryListTool,
} from '../../tools/memory';
import type { MemoryToolsOptions } from '../../tools/memory';
import { createSearchKnowledgeIndicatorsTool } from '../../tools/search_knowledge_indicators/tool';

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

Use the \`platform_streams_sig_events_search_knowledge_indicators\` tool to fetch **knowledge indicators** (KIs) — observed facts about streams and services extracted from logs and telemetry. Your job is to synthesize these into focused, actionable wiki pages.

Traces are especially rich in relationship information: they reveal service dependencies, call chains, latency distributions, and failure propagation paths that are not visible in logs or KIs alone. **When APM trace data is available, use it to enrich relationship and topology pages** — but do not rely on it exclusively, and do not skip synthesis if traces are absent.

## Organizing knowledge

Pages have **names** (unique identifiers, e.g. "nginx-error-patterns"), **titles** (human-readable), **content** (Markdown), and **categories** (e.g. "services", "operations", "streams/logs-nginx"). Choose categories that help users find the page from multiple angles.

## Key principles

- **Synthesize, don't transcribe**: Combine multiple related KIs into a single coherent page rather than creating one page per KI.
- **One topic, one page**: Pages should cover a focused topic. Don't create catch-all pages.
- **Read before writing**: Before updating an existing page, read it with \`platform_streams_memory_read\` to understand what's already there. Preserve accurate content, correct outdated information, and add genuinely new insights.
- **Precise naming**: Page names should be descriptive and unique (e.g. "nginx-prod-latency-patterns", not "nginx-observations").
- **Cross-reference**: When mentioning a concept that has its own page, add the \`page_name\` to the references array.
- **Traces are supplemental**: If \`observability_get_services\` or \`observability_get_trace_metrics\` return no data, continue synthesis using KIs and logs alone. Never block on missing APM data.

## Workflow

1. Call \`platform_streams_sig_events_search_knowledge_indicators\` (no filters) to fetch all available KIs
2. Call \`observability_get_services\` to discover instrumented services and their health (latency, error rate, throughput). If APM data is present, this reveals which services exist and how they relate.
3. For any services discovered in step 2, call \`observability_get_trace_metrics\` grouped by \`transaction.name\` to understand which operations are critical or slow. Skip this step if step 2 returned no APM services.
4. Use \`platform_streams_memory_list\` to see existing pages
5. Use \`platform_streams_memory_read\` or \`platform_streams_memory_search\` to read relevant existing pages
6. Synthesize all gathered information — KIs, service data, trace metrics — into focused wiki pages:
   - For **relationship/topology pages** (e.g. "service-dependencies", "request-flow"): incorporate trace-derived call chains, latency, and error rates where available
   - For **service pages** (e.g. "checkout-service"): add APM metrics (p99 latency, error rate) alongside log-derived KIs
   - For **failure mode pages**: use trace error rates to confirm or quantify failure patterns found in KIs
7. Use \`platform_streams_memory_write\` to create or update memory pages`,
    getInlineTools: () => {
      // Synthesis only needs read, search, list, and write — 4 tools + 1 KI tool = 5 total (limit: 7).
      const memoryTools: SkillBoundedTool[] = [
        createMemorySearchTool(options),
        createMemoryReadTool(options),
        createMemoryWriteTool(options),
        createMemoryListTool(options),
      ].map(({ tags, id, ...rest }) => ({
        ...rest,
        id: id.replaceAll('.', '_'),
      })) as SkillBoundedTool[];

      const extraTools = [];
      if (options.getScopedClients && options.server && options.logger) {
        const { availability: _availability, ...kiTool } = createSearchKnowledgeIndicatorsTool({
          getScopedClients: options.getScopedClients,
          server: options.server,
          logger: options.logger,
        });
        extraTools.push({
          ...kiTool,
          id: kiTool.id.replaceAll('.', '_'),
          experimental: false,
        } as SkillBoundedTool);
      }

      return [...memoryTools, ...extraTools];
    },
    getRegistryTools: () => ['observability.get_services', 'observability.get_trace_metrics'],
  });
