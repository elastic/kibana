/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from '@kbn/zod';
import type { EcsFlatEntry } from './get_ecs_info';

/**
 * Creates a tool that lists all available ECS root field groups (e.g., "source", "event", "host").
 * Agents can call this first to discover which ECS field groups exist, then use get_ecs_info
 * to drill into specific roots or field paths.
 *
 * @param ecsFlatData - The ECS flat field map (typically EcsFlat from @elastic/ecs)
 */
export function listEcsRootFieldsTool(
  ecsFlatData: Record<string, EcsFlatEntry>
): DynamicStructuredTool {
  const schema = z.object({});

  let cachedResult: string | undefined;

  return new DynamicStructuredTool({
    name: 'list_ecs_root_fields',
    description:
      'Lists all available ECS root field groups (e.g., "source", "event", "host", "process"). ' +
      'Returns each root with the number of sub-fields it contains and a brief description. ' +
      'Use this to discover which ECS field groups exist before calling get_ecs_info with specific root_fields or field_paths.',
    schema,
    func: async () => {
      if (cachedResult) {
        return cachedResult;
      }

      const rootCounts = new Map<string, number>();

      for (const key of Object.keys(ecsFlatData)) {
        const dotIndex = key.indexOf('.');
        if (dotIndex === -1) continue;
        const root = key.substring(0, dotIndex);
        rootCounts.set(root, (rootCounts.get(root) ?? 0) + 1);
      }

      const roots = Array.from(rootCounts.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([root, count]) => {
          const firstKey = Object.keys(ecsFlatData).find((k) => k.startsWith(`${root}.`));
          const firstEntry = firstKey ? ecsFlatData[firstKey] : undefined;
          const description = firstEntry?.short ?? firstEntry?.description ?? '';

          return {
            root,
            sub_field_count: count,
            hint: description
              ? `${description.substring(0, 80)}${description.length > 80 ? '...' : ''}`
              : `${count} sub-fields available`,
          };
        });

      cachedResult = JSON.stringify({ root_fields: roots, total_roots: roots.length });
      return cachedResult;
    },
  });
}
