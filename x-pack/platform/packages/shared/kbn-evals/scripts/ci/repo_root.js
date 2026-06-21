#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { accessSync } = require('fs');
const { resolve } = require('path');

/**
 * @returns {string}
 */
function resolveRepoRoot() {
  const candidates = [
    process.env.KIBANA_DIR,
    process.env.BUILDKITE_BUILD_CHECKOUT_PATH,
    process.cwd(),
  ].filter(Boolean);

  for (const root of candidates) {
    const marker = resolve(root, '.buildkite/pipelines/evals/evals.suites.json');
    try {
      accessSync(marker);
      return root;
    } catch {
      // try next candidate
    }
  }

  return process.cwd();
}

/**
 * @param {string} relativePath
 * @returns {string}
 */
function fromRoot(relativePath) {
  return resolve(resolveRepoRoot(), relativePath);
}

module.exports = { fromRoot };
