/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Aggregator config that delegates to the per-tree Jest configs in
// `common/`, `public/`, and `server/`. The split exists so each tree can use
// its own `setupFilesAfterEach` (notably the Lens builder setup in `public/`)
// without bleeding into the others.
//
// This file is `.cjs` on purpose: the Moon project generator (`@kbn/moon`)
// only re-applies the `jest-unit-tests` tag and the `jest-config` file group
// when a Jest config exists at the plugin's sourceRoot, so without it the
// inherited Moon `jest` task disappears and affected-package validation skips
// Lens unit tests. CI's full-run config discovery (`scripts/jest_all`) and the
// PR test-group selector glob only for `**/jest.config.js`, so the `.cjs`
// extension keeps this aggregator invisible there — preventing the three
// child configs from being executed twice.

module.exports = {
  rootDir: '../../../../..',
  projects: [
    '<rootDir>/x-pack/platform/plugins/shared/lens/common/jest.config.js',
    '<rootDir>/x-pack/platform/plugins/shared/lens/public/jest.config.js',
    '<rootDir>/x-pack/platform/plugins/shared/lens/server/jest.config.js',
  ],
};
