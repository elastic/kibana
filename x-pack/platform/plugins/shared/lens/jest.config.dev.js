/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Dev-only convenience aggregator — delegates to the per-tree configs in
// `common/`, `public/`, and `server/` via Jest's `projects` field. The split
// exists so each tree can own its own `setupFilesAfterEnv` (notably the Lens
// builder mock in `public/`) without bleeding into the others.
//
// This file is named `jest.config.dev.js` so that CI's full-run discovery
// (`scripts/jest_all`, the PR test-group selector, and the Moon project
// generator) only ever sees the three per-tree `jest.config.js` files and runs
// each Lens test file exactly once. `scripts/jest.js` and `run_jest_via_moon`
// walk up preferring `jest.config.dev.js` over `jest.config.js`, so pointing
// them at the plugin root still lands here, while pointing them at a file in
// `common/`, `public/`, or `server/` hits that tree's config directly.
//
// `roots` is intentionally set even though `projects` makes it a no-op at
// runtime: each project context inherits it, and without it they would fall
// back to `<rootDir>` (= the repo root) and each discover every test file in
// the workspace.

module.exports = {
  preset: '@kbn/test',
  rootDir: '../../../../..',
  roots: ['<rootDir>/x-pack/platform/plugins/shared/lens'],
  projects: [
    '<rootDir>/x-pack/platform/plugins/shared/lens/common/jest.config.js',
    '<rootDir>/x-pack/platform/plugins/shared/lens/public/jest.config.js',
    '<rootDir>/x-pack/platform/plugins/shared/lens/server/jest.config.js',
  ],
};
