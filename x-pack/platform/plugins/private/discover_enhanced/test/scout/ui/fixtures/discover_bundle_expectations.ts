/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Validates Discover Scout perf bundle plugin labels for the unified RSPack build.
 *
 * In RSPack dist mode, only on-demand split chunks are captured during SPA
 * navigation. Named plugin entry chunks (plugin-discover, etc.) are preloaded
 * during bootstrap and not re-fetched. On-demand chunks get the aggregated
 * 'rspack-chunk' label. Validates that every loaded label is either in the
 * expected set, the shared bundle allowlist, or a lazy-loaded named split chunk
 * (e.g. lazy_application_dependencies, lazySiemMigrationsService).
 */
export function evaluateDiscoverBundlePluginAssertion(
  loadedPluginNamesSorted: string[],
  expectedPlugins: string[],
  sharedBundleLabels: readonly string[]
): { ok: true } | { ok: false; detail: string } {
  const allowed = new Set([...expectedPlugins, ...sharedBundleLabels]);
  const subsetOk = loadedPluginNamesSorted.every(
    (name) => allowed.has(name) || name.startsWith('lazy')
  );
  if (subsetOk) {
    return { ok: true };
  }
  return {
    ok: false,
    detail: `Unexpected labels found. Loaded=${JSON.stringify(
      loadedPluginNamesSorted
    )}, allowed=${JSON.stringify([...allowed])}`,
  };
}
