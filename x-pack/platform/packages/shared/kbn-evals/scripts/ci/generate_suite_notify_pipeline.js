#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { readFileSync } = require('fs');
const { stringify } = require('yaml');

/**
 * Builds a one-step pipeline whose own Slack notify posts the message. A failed suite uses a
 * step that fails, so the post fires on `hard_failed`; a passed suite uses a step that passes,
 * so the post does not fail a green build.
 */
const buildSuiteNotifyPipeline = ({
  message,
  slackChannel,
  outcome = 'failed',
  buildUrl = '',
  pipelineName = 'Buildkite',
  buildNumber = '',
}) => {
  const footer =
    buildUrl && !message.includes(buildUrl)
      ? `\n\n<${buildUrl}|${pipelineName} #${buildNumber}>`
      : '';
  const passed = outcome === 'passed';

  return {
    steps: [
      {
        label: passed
          ? 'LLM Evals: suite owner Slack notify (passed)'
          : 'LLM Evals: suite owner Slack notify',
        command: passed ? "echo 'Posted to Slack'" : 'exit 1',
        notify: [
          {
            slack: {
              channels: [slackChannel],
              message: `${message}${footer}`,
            },
            if: passed ? 'step.outcome == "passed"' : 'step.outcome == "hard_failed"',
          },
        ],
      },
    ],
  };
};

if (require.main === module) {
  const summaryPath = process.env.EVAL_TRIAGE_SUMMARY_PATH || '';
  const slackChannel = process.env.EVAL_SUITE_SLACK_CHANNEL || '';
  const outcome = process.env.EVAL_SUITE_OUTCOME || 'failed';

  if (!summaryPath || !slackChannel || !['passed', 'failed'].includes(outcome)) {
    console.error(
      'Usage: set EVAL_TRIAGE_SUMMARY_PATH (summary.md), EVAL_SUITE_SLACK_CHANNEL (slack channel) and optionally EVAL_SUITE_OUTCOME (passed|failed, default failed).'
    );
    process.exit(1);
  }

  const pipeline = buildSuiteNotifyPipeline({
    message: readFileSync(summaryPath, 'utf8').trim(),
    slackChannel,
    outcome,
    buildUrl: process.env.BUILDKITE_BUILD_URL || '',
    pipelineName: process.env.BUILDKITE_PIPELINE_NAME || 'Buildkite',
    buildNumber: process.env.BUILDKITE_BUILD_NUMBER || '',
  });

  process.stdout.write(stringify(pipeline));
}

module.exports = { buildSuiteNotifyPipeline };
