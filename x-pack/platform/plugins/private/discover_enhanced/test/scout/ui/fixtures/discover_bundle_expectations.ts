/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const UNIFIED_BUNDLE_LABELS = [
  'core',
  'kibana',
  'one_discover_shared_deps',
  'rspack-chunk',
  'shared-core',
  'shared-misc',
  'shared-packages',
  'shared-plugins',
  'shared-root-packages',
  'shared-solution-packages',
  'vendors',
  'vendors-heavy',
] as const;

export function evaluateDiscoverBundlePluginAssertion(
  loadedPluginNames: string[],
  expectedPlugins: string[]
): { ok: true } | { ok: false; detail: string } {
  const allowed = new Set([...expectedPlugins, ...UNIFIED_BUNDLE_LABELS]);
  const unexpected = loadedPluginNames.filter(
    (name) => !allowed.has(name) && !name.startsWith('lazy')
  );

  return unexpected.length === 0
    ? { ok: true }
    : {
        ok: false,
        detail: `Unexpected labels found: ${JSON.stringify(unexpected)}`,
      };
}
