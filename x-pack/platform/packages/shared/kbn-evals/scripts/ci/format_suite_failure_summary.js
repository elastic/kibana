#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { execFileSync } = require('child_process');
const { readFileSync, writeFileSync } = require('fs');
const { suiteKeySafe } = require('./suite_key_safe');
const { fromRoot } = require('./repo_root');

const suiteId = process.argv[2] || process.env.EVAL_SUITE_ID || '';
const outputPath = process.argv[3] || process.env.EVAL_TRIAGE_SUMMARY_PATH || '';

if (!suiteId) {
  console.error('Suite id is required (arg 1 or EVAL_SUITE_ID)');
  process.exit(1);
}

const suitesPath = fromRoot('.buildkite/pipelines/evals/evals.suites.json');
const parsed = JSON.parse(readFileSync(suitesPath, 'utf8'));
const suites = Array.isArray(parsed?.suites) ? parsed.suites : [];
const suite = suites.find((s) => s?.id === suiteId) ?? null;
const suiteName = suite?.name ?? suiteId;

const safeSuite = suiteKeySafe(suiteId);
const failuresPrefix = `kbn-evals:suite-failures:${safeSuite}:`;

function getMetadataKeys() {
  try {
    const stdout = execFileSync('buildkite-agent', ['meta-data', 'keys'], {
      stdio: ['pipe', 'pipe', 'inherit'],
    });
    return String(stdout).trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function getMetadata(key) {
  try {
    const stdout = execFileSync('buildkite-agent', ['meta-data', 'get', key], {
      stdio: ['pipe', 'pipe', 'inherit'],
    });
    return String(stdout).trim();
  } catch {
    return '';
  }
}

const failingProjects = [];
for (const key of getMetadataKeys()) {
  if (!key.startsWith(failuresPrefix)) {
    continue;
  }
  const value = getMetadata(key);
  if (value) {
    failingProjects.push(value);
  }
}

const uniqueProjects = [...new Set(failingProjects)].sort();

if (uniqueProjects.length === 0) {
  console.error(`No failing projects in metadata for suite ${suiteId}`);
  process.exit(1);
}

const buildUrl = process.env.BUILDKITE_BUILD_URL || '';
const lines = [
  `:rotating_light: *${suiteName}* (\`${suiteId}\`) failed in LLM evals.`,
  '',
  '*Failing models:*',
  ...uniqueProjects.map((project) => `- \`${project}\``),
];

if (buildUrl) {
  lines.push('', `<${buildUrl}|View build>`);
}

const summary = lines.join('\n');

if (outputPath) {
  writeFileSync(outputPath, summary, 'utf8');
} else {
  process.stdout.write(summary);
}
