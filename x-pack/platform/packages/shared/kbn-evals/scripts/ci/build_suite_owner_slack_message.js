#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { execFileSync } = require('child_process');
const { readFileSync, writeFileSync, mkdtempSync, rmSync } = require('fs');
const { tmpdir } = require('os');
const { join } = require('path');
const { fromRoot } = require('./repo_root');
const {
  writeMinimalFailureContext,
  resolveTriageConnectorId,
} = require('./failure_context_helpers');
const { summarizeFailuresWithJudge } = require('./summarize_failures_with_judge');

const suiteId = process.argv[2] || process.env.EVAL_SUITE_ID || '';
const outputPath = process.argv[3] || process.env.EVAL_TRIAGE_SUMMARY_PATH || '';
const failingProjectsArg = process.argv[4] || process.env.EVAL_FAILING_PROJECTS || '';

if (!suiteId || !outputPath || !failingProjectsArg) {
  console.error(
    'Usage: build_suite_owner_slack_message.js <suiteId> <output.md> <comma-separated failing projects>'
  );
  process.exit(1);
}

const failingProjects = failingProjectsArg
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

if (failingProjects.length === 0) {
  console.error('At least one failing project is required');
  process.exit(1);
}

const suitesPath = fromRoot('.buildkite/pipelines/evals/evals.suites.json');
const parsed = JSON.parse(readFileSync(suitesPath, 'utf8'));
const suites = Array.isArray(parsed?.suites) ? parsed.suites : [];
const suite = suites.find((entry) => entry?.id === suiteId) ?? null;
const suiteName = suite?.name ?? suiteId;
const buildUrl = process.env.BUILDKITE_BUILD_URL || '';

const lines = [
  `:rotating_light: *${suiteName}* (\`${suiteId}\`) failed in LLM evals.`,
  '',
  '*Failing models:*',
  ...failingProjects.map((project) => `- \`${project}\``),
];

if (buildUrl) {
  lines.push('', `<${buildUrl}|View build>`);
}

/**
 * @param {string} judgeId
 * @param {string} body
 */
function appendTriageSection(judgeId, body) {
  lines.push('', `*Triage summary (judge: \`${judgeId}\`):*`, body);
}

/**
 * @param {unknown} error
 * @returns {string}
 */
function formatTriageError(error) {
  return error instanceof Error ? error.message : String(error);
}

async function collectFailureContext(contextPath) {
  try {
    execFileSync(
      process.execPath,
      [
        fromRoot('x-pack/platform/packages/shared/kbn-evals/scripts/ci/collect_failure_context.js'),
        suiteId,
        contextPath,
        failingProjectsArg,
      ],
      { stdio: 'inherit', env: process.env }
    );
  } catch {
    writeMinimalFailureContext(contextPath, {
      suiteId,
      suiteName,
      buildId: process.env.BUILDKITE_BUILD_ID,
      buildUrl,
      failingProjects,
    });
  }
}

async function main() {
  const judgeId = resolveTriageConnectorId() || 'unknown';
  const tempDir = mkdtempSync(join(tmpdir(), 'kbn-evals-slack-'));
  const contextPath = join(tempDir, 'failure-context.json');

  try {
    console.error('--- Collecting failure context for judge triage');
    await collectFailureContext(contextPath);

    console.error(`--- Generating judge triage summary (judge: ${judgeId})`);
    const { summary, judgeId: resolvedJudgeId } = await summarizeFailuresWithJudge(contextPath);
    appendTriageSection(resolvedJudgeId, summary);
  } catch (error) {
    const message = formatTriageError(error);
    console.error(`--- Judge triage summary failed: ${message}`);
    appendTriageSection(
      judgeId,
      `_Judge triage could not be generated: ${message}. See the suite owner notify Buildkite step for details._`
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }

  writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
