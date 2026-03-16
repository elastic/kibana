/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsFlatEntry } from './get_ecs_info';

let cachedEcsFlat: Record<string, EcsFlatEntry> | undefined;

/**
 * Lazily loads the ECS flat field map from @elastic/ecs using dynamic import,
 * bypassing the static import restriction (bundle size concern does not apply
 * to server-side lazy loads).
 */
export const loadEcsFlatData = async (): Promise<Record<string, EcsFlatEntry>> => {
  if (cachedEcsFlat) {
    return cachedEcsFlat;
  }
  const mod = await import('@elastic/ecs');
  cachedEcsFlat = mod.EcsFlat as unknown as Record<string, EcsFlatEntry>;
  return cachedEcsFlat;
};

/**
 * Computes a compact summary of ECS root field groups for prompt injection.
 * Returns a markdown-formatted string listing each root with its sub-field count.
 */
export const getEcsRootFieldsSummary = (ecsFlatData: Record<string, EcsFlatEntry>): string => {
  const rootCounts = new Map<string, number>();

  for (const key of Object.keys(ecsFlatData)) {
    const dotIndex = key.indexOf('.');
    if (dotIndex === -1) continue;
    const root = key.substring(0, dotIndex);
    rootCounts.set(root, (rootCounts.get(root) ?? 0) + 1);
  }

  const lines = Array.from(rootCounts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([root, count]) => `- **${root}** (${count} fields)`);

  return lines.join('\n');
};
