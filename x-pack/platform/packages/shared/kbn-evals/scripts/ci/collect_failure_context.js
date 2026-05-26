#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { execFileSync } = require('child_process');
const { readFileSync, writeFileSync } = require('fs');
const { Client } = require('@elastic/elasticsearch');
const { fromRoot } = require('./repo_root');
const { suiteKeySafe } = require('./suite_key_safe');
const {
  EVALUATIONS_INDEX,
  MAX_LOG_EXCERPT_CHARS,
  failureLogMetadataKey,
  buildFailureScoresQuery,
  truncateText,
  groupLowScoresByRunId,
  expectedRunId,
  truncateContextJson,
} = require('./failure_context_helpers');

const suiteId = process.argv[2] || process.env.EVAL_SUITE_ID || '';
const outputPath = process.argv[3] || process.env.EVAL_FAILURE_CONTEXT_PATH || '';
const failingProjectsArg = process.argv[4] || process.env.EVAL_FAILING_PROJECTS || '';

if (!suiteId || !outputPath) {
  console.error(
    'Usage: collect_failure_context.js <suiteId> <output.json> [comma-separated failing projects]'
  );
  process.exit(1);
}

const buildId = process.env.BUILDKITE_BUILD_ID || '';
const buildUrl = process.env.BUILDKITE_BUILD_URL || '';

/**
 * @returns {string[]}
 */
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

/**
 * @param {string} key
 * @returns {string}
 */
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

/**
 * @returns {string[]}
 */
function resolveFailingProjects() {
  if (failingProjectsArg) {
    return failingProjectsArg
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }

  const safeSuite = suiteKeySafe(suiteId);
  const prefix = `kbn-evals:suite-failures:${safeSuite}:`;
  const projects = [];

  for (const key of getMetadataKeys()) {
    if (!key.startsWith(prefix)) {
      continue;
    }
    const value = getMetadata(key);
    if (value) {
      projects.push(value);
    }
  }

  return [...new Set(projects)].sort();
}

/**
 * @param {string[]} failingProjects
 * @returns {Promise<Record<string, { runId: string; lowScores: Array<Record<string, unknown>> }>>}
 */
async function fetchScoresByRun(failingProjects) {
  const esUrl = process.env.EVALUATIONS_ES_URL || '';
  const esApiKey = process.env.EVALUATIONS_ES_API_KEY || '';

  if (!buildId || !esUrl || !esApiKey) {
    return {};
  }

  const client = new Client({
    node: esUrl,
    auth: { apiKey: esApiKey },
  });

  const response = await client.search({
    index: EVALUATIONS_INDEX,
    size: 500,
    query: buildFailureScoresQuery(buildId, suiteId),
    sort: [{ '@timestamp': 'desc' }],
  });

  const hits = (response.hits?.hits ?? []).map((hit) => ({
    _source: hit._source,
  }));

  const grouped = groupLowScoresByRunId(hits);

  /** @type {Record<string, { runId: string; lowScores: Array<Record<string, unknown>> }>} */
  const byProject = {};

  for (const project of failingProjects) {
    const runId = expectedRunId(buildId, project);
    if (grouped[runId]) {
      byProject[project] = grouped[runId];
    }
  }

  return byProject;
}

async function main() {
  const suitesPath = fromRoot('.buildkite/pipelines/evals/evals.suites.json');
  const parsed = JSON.parse(readFileSync(suitesPath, 'utf8'));
  const suites = Array.isArray(parsed?.suites) ? parsed.suites : [];
  const suite = suites.find((entry) => entry?.id === suiteId) ?? null;
  const suiteName = suite?.name ?? suiteId;

  const failingProjects = resolveFailingProjects();
  if (failingProjects.length === 0) {
    console.error(`No failing projects found for suite ${suiteId}`);
    process.exit(1);
  }

  /** @type {Record<string, { logExcerpt?: string; lowScores?: Array<Record<string, unknown>>; runId?: string; hasScoreData: boolean }>} */
  const models = {};

  for (const project of failingProjects) {
    const logKey = failureLogMetadataKey(suiteId, project);
    const logExcerpt = truncateText(getMetadata(logKey), MAX_LOG_EXCERPT_CHARS);
    models[project] = {
      hasScoreData: false,
      ...(logExcerpt ? { logExcerpt } : {}),
    };
  }

  let scoresByProject = {};
  try {
    scoresByProject = await fetchScoresByRun(failingProjects);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to query evaluation scores: ${message}`);
  }

  for (const [project, scores] of Object.entries(scoresByProject)) {
    if (!models[project]) {
      models[project] = { hasScoreData: false };
    }
    models[project].runId = scores.runId;
    models[project].lowScores = scores.lowScores;
    models[project].hasScoreData = scores.lowScores.length > 0;
  }

  const context = {
    suiteId,
    suiteName,
    buildId: buildId || undefined,
    buildUrl: buildUrl || undefined,
    failingProjects,
    models,
  };

  writeFileSync(outputPath, truncateContextJson(context), 'utf8');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
