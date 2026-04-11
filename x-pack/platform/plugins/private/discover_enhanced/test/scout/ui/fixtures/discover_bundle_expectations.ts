/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Validates Discover Scout perf bundle plugin labels for legacy webpack vs unified RSPack.
 * [rspack-transition] Collapse to RSPack-only when the legacy optimizer is removed.
 */
export function evaluateDiscoverBundlePluginAssertion(
  loadedPluginNamesSorted: string[],
  expectedPlugins: string[],
  rspackOnlyBundleLabels: readonly string[]
): { ok: true } | { ok: false; detail: string } {
  const usesRspackBundles = loadedPluginNamesSorted.includes('kibana');
  const sortedExpected = [...expectedPlugins].sort((a, b) => a.localeCompare(b));

  if (usesRspackBundles) {
    const rspackAllowed = new Set([...expectedPlugins, ...rspackOnlyBundleLabels]);
    const subsetOk = loadedPluginNamesSorted.every((name) => rspackAllowed.has(name));
    const includesExpected = expectedPlugins.every((name) =>
      loadedPluginNamesSorted.includes(name)
    );
    if (subsetOk && includesExpected) {
      return { ok: true };
    }
    return {
      ok: false,
      detail: `RSPack: allowlist or missing expected plugin. Loaded=${JSON.stringify(
        loadedPluginNamesSorted
      )}`,
    };
  }

  const legacyOk = loadedPluginNamesSorted.join('\0') === sortedExpected.join('\0');
  if (legacyOk) {
    return { ok: true };
  }
  return {
    ok: false,
    detail: `Legacy: expected ${JSON.stringify(sortedExpected)} got ${JSON.stringify(
      loadedPluginNamesSorted
    )}`,
  };
}
