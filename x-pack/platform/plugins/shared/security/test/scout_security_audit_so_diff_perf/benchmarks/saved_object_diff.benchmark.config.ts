/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * `@kbn/bench` config for the saved object diff helper. Not run in CI; see ../README.md.
 *
 *   NODE_OPTIONS=--expose-gc node scripts/bench --config \
 *     x-pack/platform/plugins/shared/security/test/scout_security_audit_so_diff_perf/benchmarks/saved_object_diff.benchmark.config.ts
 */
const bench = (name: string, description: string, file: string) => ({
  kind: 'module' as const,
  name,
  description,
  module: require.resolve(`./${file}`),
  compare: { missing: 'skip' as const },
});

const config = {
  runs: 3,
  name: 'saved-object-diff',
  benchmarks: [
    bench('diff.nested-1k-update', '~1k leaves, one leaf changed', 'nested_1k'),
    bench('diff.nested-10k-update', '~10k leaves, one leaf changed', 'nested_10k'),
    bench('diff.nested-100k-update', '~100k leaves, one leaf changed', 'nested_100k'),
    bench('diff.nested-10k-create', '~10k leaves, before={} (all adds)', 'nested_10k_create'),
    bench('diff.nested-10k-all-changed', '~10k leaves, 2000 replace ops', 'nested_10k_all_changed'),
    bench(
      'diff.array-of-objects-2k-reordered',
      '2k-element array of objects, keys reordered',
      'array_of_objects_2k'
    ),
    bench(
      'diff.lens-like-50-layers',
      '~560 leaves + 200kb string clamped by fieldSizeLimit',
      'lens_like'
    ),
  ],
};

export default config;
