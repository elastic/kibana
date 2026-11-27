#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Writes the weekly quality score report of one suite (Slack mrkdwn) for the suite owner post.
 *
 * Env:
 * - EVAL_SUITE_ID (required): the suite to report on.
 * - EVAL_WEEKLY_REPORT_OUT (required): where to write the report.
 * - EVAL_WEEKLY_REPORT_BUILD: the weekly build number to report on; defaults to
 *   BUILDKITE_BUILD_NUMBER on the weekly pipeline, otherwise the latest weekly build.
 * - EVAL_KBN_URL / EVAL_KBN_API_KEY, or `evaluationsKbn` in KBN_EVALS_CONFIG_B64: the evals cluster.
 * - OPENROUTER_BASE_URL / OPENROUTER_API_KEY, or `openrouter` in KBN_EVALS_CONFIG_B64: the analysis
 *   model. Without them, or when the agent fails, the report falls back to a plain summary.
 * - EVAL_WEEKLY_REPORT_MODEL: overrides the analysis model.
 */

const { writeFileSync } = require('fs');
const { parseVaultConfig } = require('../ai_connectors');
const { createEvalsApiClient } = require('./evals_api_client');
const { WEEKLY_PIPELINE_SLUG, collectWeeklyScores } = require('./collect_weekly_scores');
const { runWeeklyReportAgent } = require('./report_agent');
const { renderSlackReport } = require('./render_slack_report');

const resolveEvalsCluster = () => {
  const evaluationsKbn = parseVaultConfig()?.evaluationsKbn ?? {};
  return {
    kibanaUrl: process.env.EVAL_KBN_URL || evaluationsKbn.url || '',
    apiKey: process.env.EVAL_KBN_API_KEY || evaluationsKbn.apiKey || '',
  };
};

const resolveBuildNumber = () => {
  if (process.env.EVAL_WEEKLY_REPORT_BUILD) return Number(process.env.EVAL_WEEKLY_REPORT_BUILD);
  if (process.env.BUILDKITE_PIPELINE_SLUG === WEEKLY_PIPELINE_SLUG) {
    return Number(process.env.BUILDKITE_BUILD_NUMBER) || undefined;
  }
  return undefined;
};

const main = async () => {
  const suiteId = process.env.EVAL_SUITE_ID;
  const outPath = process.env.EVAL_WEEKLY_REPORT_OUT;
  if (!suiteId || !outPath) {
    throw new Error('EVAL_SUITE_ID and EVAL_WEEKLY_REPORT_OUT are required');
  }

  const { kibanaUrl, apiKey } = resolveEvalsCluster();
  const client = createEvalsApiClient({ kibanaUrl, apiKey });

  console.log(`Collecting weekly scores for ${suiteId}`);
  const scores = await collectWeeklyScores({ client, suiteId, buildNumber: resolveBuildNumber() });
  console.log(
    `Build #${scores.build.buildNumber}: ${scores.models
      .map((model) => `${model.model} vs #${model.baselineBuildNumber ?? 'none'}`)
      .join(', ')}`
  );

  let report;
  let agentError;
  try {
    const result = await runWeeklyReportAgent({ scores, client });
    report = result.report;
    console.log(`Report agent (${result.modelId}) finished in ${result.turns} turn(s)`);
  } catch (error) {
    agentError = error;
    console.log(`Report agent failed, using the plain summary: ${error.message}`);
  }

  const text = renderSlackReport({ scores, report, kibanaUrl: client.baseUrl, agentError });
  writeFileSync(outPath, `${text}\n`);
  console.log(`--- Weekly score report\n${text}`);
};

main().catch((error) => {
  console.error(`Weekly score report failed: ${error.stack ?? error.message}`);
  process.exit(1);
});
