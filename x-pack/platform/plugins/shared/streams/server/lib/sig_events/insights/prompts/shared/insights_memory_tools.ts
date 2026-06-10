/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolDefinition } from '@kbn/inference-common';

/** Read-only memory tool for insights discovery (no writes during discovery). */
export const INSIGHTS_DISCOVERY_MEMORY_TOOLS = {
  read_memory_page: {
    description:
      'Read the full content of an existing sigevents memory wiki page by name. Use before forming insights to load architecture, dependencies, and known failure modes.',
    schema: {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string' as const,
          description:
            'The wiki page name (e.g. "payment-api-service", "streams/logs-otel-overview")',
        },
      },
      required: ['name'] as const,
    },
  },
} satisfies Record<string, ToolDefinition>;
