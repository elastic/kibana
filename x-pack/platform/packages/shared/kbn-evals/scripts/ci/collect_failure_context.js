#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { execFileSync } = require('child_process');
const {
  MAX_LOG_EXCERPT_CHARS,
  failureLogMetadataKey,
  failureLogMetadataKeysForProject,
  truncateText,
  redactSecrets,
} = require('./failure_context_helpers');

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

function listMetadataKeys() {
  try {
    const stdout = execFileSync('buildkite-agent', ['meta-data', 'keys'], {
      stdio: ['pipe', 'pipe', 'inherit'],
    });
    return String(stdout)
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Build the LLM triage failure context for a suite from the per-model log
 * excerpts that run_suite.sh records in Buildkite metadata.
 *
 * @param {{ suiteId: string; suiteName: string; failingProjects: string[]; buildId?: string; buildUrl?: string }} options
 * @returns {{ suiteId: string; suiteName: string; buildId?: string; buildUrl?: string; failingProjects: string[]; models: Record<string, { logExcerpt?: string }> }}
 */
function collectFailureContext({ suiteId, suiteName, failingProjects, buildId, buildUrl }) {
  const models = {};
  const allKeys = listMetadataKeys();

  for (const project of failingProjects) {
    const base = failureLogMetadataKey(suiteId, project);
    const excerpts = failureLogMetadataKeysForProject(allKeys, suiteId, project)
      .map((key) => ({ shardId: key.slice(base.length + 1), text: getMetadata(key) }))
      .filter(({ text }) => text);

    // A sharded suite records one excerpt per shard, all for the same model. Split the
    // per-model budget between them so the last shard's tail cannot evict the others.
    const perExcerptChars = Math.floor(MAX_LOG_EXCERPT_CHARS / Math.max(excerpts.length, 1));

    const logExcerpt = excerpts
      .map(({ shardId, text }) => {
        const excerpt = redactSecrets(truncateText(text, perExcerptChars));
        return shardId ? `[shard: ${shardId}]\n${excerpt}` : excerpt;
      })
      .join('\n\n');

    models[project] = logExcerpt ? { logExcerpt } : {};
  }

  return {
    suiteId,
    suiteName,
    buildId: buildId || undefined,
    buildUrl: buildUrl || undefined,
    failingProjects,
    models,
  };
}

module.exports = { collectFailureContext };
