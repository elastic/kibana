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
 * 'rspack-chunk' label. Some split chunks also surface with source-path-derived
 * labels from the unified RSPack build. Validates that every loaded label is
 * either in the expected set, the shared bundle allowlist, a source-path chunk
 * attributable to an expected Discover dependency, or a lazy-loaded named split
 * chunk (e.g. lazy_application_dependencies, lazySiemMigrationsService).
 */

function normalizeAlphaNumericLabel(value: string): string {
  return value.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function isSourcePathPluginChunk(label: string): boolean {
  return (
    label.startsWith('src_platform_plugins_') ||
    label.startsWith('x-pack_platform_plugins_') ||
    label.startsWith('x-pack_solutions_plugins_')
  );
}

function isSourcePathPlatformPackageChunk(label: string): boolean {
  return label.startsWith('src_platform_packages_');
}

function isSourcePathSolutionPackageChunk(label: string): boolean {
  return (
    label.startsWith('x-pack_platform_packages_') ||
    label.startsWith('x-pack_solutions_packages_') ||
    label.startsWith('x-pack_packages_')
  );
}

function isExpectedSourcePathPluginChunk(label: string, expectedPlugins: string[]): boolean {
  if (!isSourcePathPluginChunk(label)) {
    return false;
  }

  const normalizedLabel = normalizeAlphaNumericLabel(label);
  return expectedPlugins.some((pluginId) =>
    normalizedLabel.includes(normalizeAlphaNumericLabel(pluginId))
  );
}

/**
 * Returns true when all loaded labels are expected; throws with the offending
 * labels otherwise.
 */
export function evaluateDiscoverBundlePluginAssertion(
  loadedPluginNames: string[],
  expectedPlugins: string[],
  sharedBundleLabels: readonly string[]
): true {
  const allowed = new Set([...expectedPlugins, ...sharedBundleLabels]);
  const isAllowed = (name: string) =>
    allowed.has(name) ||
    name.startsWith('lazy') ||
    isExpectedSourcePathPluginChunk(name, expectedPlugins) ||
    (isSourcePathPlatformPackageChunk(name) && allowed.has('shared-packages')) ||
    (isSourcePathSolutionPackageChunk(name) && allowed.has('shared-solution-packages'));
  const unexpected = loadedPluginNames.filter((name) => !isAllowed(name));
  if (unexpected.length > 0) {
    throw new Error(
      `Unexpected plugin bundles loaded on page: ${JSON.stringify(
        unexpected
      )}. Loaded=${JSON.stringify(loadedPluginNames)}, allowed=${JSON.stringify([...allowed])}`
    );
  }
  return true;
}
