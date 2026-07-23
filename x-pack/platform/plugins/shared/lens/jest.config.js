/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Aggregator config — delegates to the per-tree configs in `common/`,
// `public/`, and `server/` via Jest's `projects` field. The split exists so
// each tree can own its own `setupFilesAfterEnv` (notably the Lens builder
// mock in `public/`) without bleeding into the others; in `projects` mode
// Jest loads each project independently, so per-tree setup files stay scoped.
//
// `roots` is intentionally set even though `projects` makes it a no-op at
// runtime: the regex-based parser in `src/.../kbn-test/src/jest/configs/
// get_jest_configs.ts` does not understand `projects` and would otherwise
// default `roots` to `<rootDir>` (= repo root), causing this config to look
// like it owns every test file in the repo and triggering a SearchSource
// recheck on every other config in the workspace.
//
// The per-tree configs live as `jest.config.dev.js` so they are invisible to
// CI's full-run discovery (`scripts/jest_all`, the PR test-group selector,
// and the Moon project generator), avoiding duplicate execution. `scripts/
// jest.js` and `run_jest_via_moon` walk up preferring `jest.config.dev.js`
// over `jest.config.js`, so developers running specific test files still hit
// the right tree-scoped config directly.

module.exports = {
  preset: '@kbn/test',
  rootDir: '../../../../..',
  roots: ['<rootDir>/x-pack/platform/plugins/shared/lens'],
  projects: [
    '<rootDir>/x-pack/platform/plugins/shared/lens/common/jest.config.dev.js',
    '<rootDir>/x-pack/platform/plugins/shared/lens/public/jest.config.dev.js',
    '<rootDir>/x-pack/platform/plugins/shared/lens/server/jest.config.dev.js',
  ],
};
